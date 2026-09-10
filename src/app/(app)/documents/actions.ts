"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import type { DocumentStatus, DocumentType, CertificateStatus, CertificateType } from "@/types/database";

export interface ActionResult {
  error?: string;
  ok?: boolean;
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
