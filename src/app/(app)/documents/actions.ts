"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import {
  extractCertificateFields,
  extractDocumentFields,
  type ExtractedCertificateFields,
  type ExtractedDocumentFields,
} from "@/lib/document-extraction";
import type {
  DocumentStatus,
  DocumentType,
  CertificateStatus,
  CertificateType,
  EvidenceKind,
} from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface ActionResult {
  error?: string;
  ok?: boolean;
}

// ------------------------------------------------------- AI file extraction
//
// Called directly from the "New Certificate" / "New Document" forms (not via
// useActionState - just a plain server action invoked from a button's
// onClick) to read an attached file and pre-fill the form. The user always
// reviews the result before saving; nothing is written to the database here.

export interface ExtractResult<T> {
  error?: string;
  data?: T;
}

export async function extractCertificateFieldsAction(
  formData: FormData,
): Promise<ExtractResult<ExtractedCertificateFields>> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "الرجاء اختيار ملف أولاً" };
  return extractCertificateFields(file);
}

export async function extractDocumentFieldsAction(
  formData: FormData,
): Promise<ExtractResult<ExtractedDocumentFields>> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "الرجاء اختيار ملف أولاً" };
  return extractDocumentFields(file);
}

// ------------------------------------------------------------- shared upload

function evidenceKindFor(mimeType: string): EvidenceKind {
  if (mimeType.startsWith("image/")) return "photo";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}

// Uploads a file the user attached on a "New ..." form as the entity's first
// evidence record, right after that entity is created. Best-effort: a
// failure here is logged but never blocks creating the record itself, same
// as if the user had just skipped attaching a file and used the evidence
// uploader on the detail page afterwards.
async function attachEvidenceIfPresent(
  supabase: SupabaseServerClient,
  organizationId: string,
  entityType: "document" | "certificate",
  entityId: string,
  formData: FormData,
) {
  const file = formData.get(entityType === "certificate" ? "certificate_file" : "document_file");
  if (!(file instanceof File) || file.size === 0) return;

  const path = `${organizationId}/${entityType}/${entityId}/${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("evidence").upload(path, file, { upsert: false });
  if (uploadError) {
    console.error("attachEvidenceIfPresent upload failed:", uploadError.message);
    return;
  }
  const { error: insertError } = await supabase.from("evidence_files").insert({
    entity_type: entityType,
    entity_id: entityId,
    file_path: path,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    kind: evidenceKindFor(file.type),
  });
  if (insertError) console.error("attachEvidenceIfPresent insert failed:", insertError.message);
}

// ---------------------------------------------------------------- documents

export async function createDocument(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await getSessionContext();
  if (!session?.activeOrgId) return { error: "لا توجد منظمة نشطة" };

  const title = String(formData.get("title") ?? "").trim();
  const titleAr = String(formData.get("title_ar") ?? "").trim();
  const documentType = (String(formData.get("document_type") ?? "sop") || "sop") as DocumentType;
  const departmentId = (formData.get("department_id") as string) || null;
  const ownerId = (formData.get("owner_id") as string) || session.userId;
  const reviewDate = (formData.get("review_date") as string) || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!title && !titleAr) return { error: "الرجاء إدخال عنوان المستند" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .insert({
      organization_id: session.activeOrgId,
      title: title || titleAr,
      title_ar: titleAr || title,
      document_type: documentType,
      department_id: departmentId,
      owner_id: ownerId,
      review_date: reviewDate,
      notes,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "تعذر إنشاء المستند: " + (error?.message ?? "") };

  await attachEvidenceIfPresent(supabase, session.activeOrgId, "document", data.id, formData);

  revalidatePath("/documents");
  redirect(`/documents/${data.id}`);
}

export async function updateDocument(documentId: string, formData: FormData): Promise<ActionResult> {
  const titleAr = String(formData.get("title_ar") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const departmentId = (formData.get("department_id") as string) || null;
  const ownerId = (formData.get("owner_id") as string) || null;
  const reviewDate = (formData.get("review_date") as string) || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .update({
      title: title || undefined,
      title_ar: titleAr || undefined,
      department_id: departmentId,
      owner_id: ownerId,
      review_date: reviewDate,
      notes,
    })
    .eq("id", documentId);

  revalidatePath(`/documents/${documentId}`);
  return error ? { error: error.message } : { ok: true };
}

export async function changeDocumentStatus(documentId: string, status: DocumentStatus): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("documents").update({ status }).eq("id", documentId);
  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/documents");
  return error ? { error: error.message } : { ok: true };
}

export async function createDocumentRevision(documentId: string): Promise<ActionResult & { newId?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_document_revision", { p_document_id: documentId });
  if (error || !data) return { error: error?.message ?? "تعذر إنشاء نسخة جديدة" };
  revalidatePath("/documents");
  revalidatePath(`/documents/${documentId}`);
  return { ok: true, newId: data as unknown as string };
}

// ---------------------------------------------------------------- certificates

export async function createCertificate(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await getSessionContext();
  if (!session?.activeOrgId) return { error: "لا توجد منظمة نشطة" };

  const name = String(formData.get("name") ?? "").trim();
  const nameAr = String(formData.get("name_ar") ?? "").trim();
  const siteId = (formData.get("site_id") as string) || null;
  const certificateType = (String(formData.get("certificate_type") ?? "other") || "other") as CertificateType;
  const issuingAuthority = String(formData.get("issuing_authority") ?? "").trim() || null;
  const externalReference = String(formData.get("external_reference") ?? "").trim() || null;
  const issueDate = (formData.get("issue_date") as string) || null;
  const expiryDate = (formData.get("expiry_date") as string) || null;
  const responsibleUserId = (formData.get("responsible_user_id") as string) || session.userId;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name && !nameAr) return { error: "الرجاء إدخال اسم الشهادة / الترخيص" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("certificates")
    .insert({
      organization_id: session.activeOrgId,
      site_id: siteId,
      name: name || nameAr,
      name_ar: nameAr || name,
      certificate_type: certificateType,
      issuing_authority: issuingAuthority,
      external_reference: externalReference,
      issue_date: issueDate,
      expiry_date: expiryDate,
      responsible_user_id: responsibleUserId,
      notes,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "تعذر إنشاء السجل: " + (error?.message ?? "") };

  await attachEvidenceIfPresent(supabase, session.activeOrgId, "certificate", data.id, formData);

  revalidatePath("/documents/certificates");
  redirect(`/documents/certificates/${data.id}`);
}

export async function updateCertificate(certificateId: string, formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const nameAr = String(formData.get("name_ar") ?? "").trim();
  const issuingAuthority = String(formData.get("issuing_authority") ?? "").trim() || null;
  const externalReference = String(formData.get("external_reference") ?? "").trim() || null;
  const issueDate = (formData.get("issue_date") as string) || null;
  const expiryDate = (formData.get("expiry_date") as string) || null;
  const responsibleUserId = (formData.get("responsible_user_id") as string) || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("certificates")
    .update({
      name: name || undefined,
      name_ar: nameAr || undefined,
      issuing_authority: issuingAuthority,
      external_reference: externalReference,
      issue_date: issueDate,
      expiry_date: expiryDate,
      responsible_user_id: responsibleUserId,
      notes,
    })
    .eq("id", certificateId);

  revalidatePath(`/documents/certificates/${certificateId}`);
  return error ? { error: error.message } : { ok: true };
}

export async function changeCertificateStatus(certificateId: string, status: CertificateStatus): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("certificates").update({ status }).eq("id", certificateId);
  revalidatePath(`/documents/certificates/${certificateId}`);
  revalidatePath("/documents/certificates");
  return error ? { error: error.message } : { ok: true };
}
