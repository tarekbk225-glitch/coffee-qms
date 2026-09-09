"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import type { QuestionPolarity, QuestionType, TemplateStatus } from "@/types/database";

export interface ActionResult {
  error?: string;
  ok?: boolean;
}

function slugCode(input: string) {
  return (
    input
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9؀-ۿ\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 30) || `TPL-${Date.now()}`
  );
}

export async function createTemplate(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await getSessionContext();
  if (!session?.activeOrgId) return { error: "لا توجد منظمة نشطة" };

  const name = String(formData.get("name") ?? "").trim();
  const nameAr = String(formData.get("name_ar") ?? "").trim();
  const category = String(formData.get("category") ?? "general").trim() || "general";
  const departmentId = (formData.get("department_id") as string) || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name && !nameAr) return { error: "الرجاء إدخال اسم القالب" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("templates")
    .insert({
      organization_id: session.activeOrgId,
      code: slugCode(name || nameAr),
      name: name || nameAr,
      name_ar: nameAr || name,
      category,
      department_id: departmentId,
      description,
      owner_id: session.userId,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "تعذر إنشاء القالب: " + (error?.message ?? "") };

  redirect(`/templates/${data.id}`);
}

export async function updateTemplateMeta(templateId: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const nameAr = String(formData.get("name_ar") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  const { error } = await supabase
    .from("templates")
    .update({ name, name_ar: nameAr, category, description })
    .eq("id", templateId);

  revalidatePath(`/templates/${templateId}`);
  return error ? { error: error.message } : { ok: true };
}

export async function changeTemplateStatus(templateId: string, status: TemplateStatus): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("templates").update({ status }).eq("id", templateId);
  revalidatePath(`/templates/${templateId}`);
  revalidatePath("/templates");
  return error ? { error: error.message } : { ok: true };
}

export async function deleteTemplate(templateId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("templates").delete().eq("id", templateId);
  revalidatePath("/templates");
  return error ? { error: error.message } : { ok: true };
}

export async function createRevision(templateId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_template_revision", { p_template_id: templateId });
  if (error || !data) return { error: error?.message ?? "تعذرت العملية" };
  redirect(`/templates/${data}`);
}

export async function addSection(templateId: string, orgId: string, sortOrder: number, formData: FormData): Promise<ActionResult> {
  const title = String(formData.get("title") ?? "").trim();
  const titleAr = String(formData.get("title_ar") ?? "").trim();
  if (!title && !titleAr) return { error: "الرجاء إدخال عنوان القسم" };

  const supabase = await createClient();
  const { error } = await supabase.from("template_sections").insert({
    organization_id: orgId,
    template_id: templateId,
    title: title || titleAr,
    title_ar: titleAr || title,
    sort_order: sortOrder,
  });
  revalidatePath(`/templates/${templateId}`);
  return error ? { error: error.message } : { ok: true };
}

export async function updateSection(templateId: string, sectionId: string, formData: FormData): Promise<ActionResult> {
  const title = String(formData.get("title") ?? "").trim();
  const titleAr = String(formData.get("title_ar") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.from("template_sections").update({ title, title_ar: titleAr }).eq("id", sectionId);
  revalidatePath(`/templates/${templateId}`);
  return error ? { error: error.message } : { ok: true };
}

export async function swapSectionOrder(
  templateId: string,
  a: { id: string; sortOrder: number },
  b: { id: string; sortOrder: number }
): Promise<ActionResult> {
  const supabase = await createClient();
  const [r1, r2] = await Promise.all([
    supabase.from("template_sections").update({ sort_order: b.sortOrder }).eq("id", a.id),
    supabase.from("template_sections").update({ sort_order: a.sortOrder }).eq("id", b.id),
  ]);
  revalidatePath(`/templates/${templateId}`);
  return r1.error || r2.error ? { error: (r1.error ?? r2.error)?.message } : { ok: true };
}

export async function deleteSection(templateId: string, sectionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("template_sections").delete().eq("id", sectionId);
  revalidatePath(`/templates/${templateId}`);
  return error ? { error: error.message } : { ok: true };
}

export interface QuestionFormValues {
  prompt: string;
  prompt_ar: string;
  type: QuestionType;
  is_required: boolean;
  is_critical: boolean;
  weight: number;
  instructions: string;
  min_value: string;
  max_value: string;
  unit: string;
  options: string; // comma separated
  polarity: QuestionPolarity;
  require_photo_on_fail: boolean;
  require_comment_on_fail: boolean;
  require_capa_on_fail: boolean;
}

function parseQuestionForm(formData: FormData) {
  const options = String(formData.get("options") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((label) => ({ value: label, label }));

  return {
    prompt: String(formData.get("prompt") ?? "").trim(),
    prompt_ar: String(formData.get("prompt_ar") ?? "").trim(),
    type: String(formData.get("type") ?? "text") as QuestionType,
    is_required: formData.get("is_required") === "on",
    is_critical: formData.get("is_critical") === "on",
    weight: Number(formData.get("weight") ?? 1) || 1,
    instructions: String(formData.get("instructions") ?? "").trim() || null,
    min_value: formData.get("min_value") ? Number(formData.get("min_value")) : null,
    max_value: formData.get("max_value") ? Number(formData.get("max_value")) : null,
    unit: String(formData.get("unit") ?? "").trim() || null,
    options,
    polarity: (String(formData.get("polarity") ?? "positive") as QuestionPolarity),
    require_photo_on_fail: formData.get("require_photo_on_fail") === "on",
    require_comment_on_fail: formData.get("require_comment_on_fail") === "on",
    require_capa_on_fail: formData.get("require_capa_on_fail") === "on",
  };
}

export async function addQuestion(
  templateId: string,
  orgId: string,
  sectionId: string,
  sortOrder: number,
  formData: FormData
): Promise<ActionResult> {
  const values = parseQuestionForm(formData);
  if (!values.prompt && !values.prompt_ar) return { error: "الرجاء إدخال نص السؤال" };

  const supabase = await createClient();
  const { error } = await supabase.from("template_questions").insert({
    organization_id: orgId,
    template_id: templateId,
    section_id: sectionId,
    sort_order: sortOrder,
    prompt: values.prompt || values.prompt_ar,
    prompt_ar: values.prompt_ar || values.prompt,
    type: values.type,
    is_required: values.is_required,
    is_critical: values.is_critical,
    weight: values.weight,
    instructions: values.instructions,
    min_value: values.min_value,
    max_value: values.max_value,
    unit: values.unit,
    options: values.options,
    polarity: values.polarity,
    require_photo_on_fail: values.require_photo_on_fail,
    require_comment_on_fail: values.require_comment_on_fail,
    require_capa_on_fail: values.require_capa_on_fail,
  });
  revalidatePath(`/templates/${templateId}`);
  return error ? { error: error.message } : { ok: true };
}

export async function updateQuestion(templateId: string, questionId: string, formData: FormData): Promise<ActionResult> {
  const values = parseQuestionForm(formData);
  const supabase = await createClient();
  const { error } = await supabase
    .from("template_questions")
    .update({
      prompt: values.prompt || values.prompt_ar,
      prompt_ar: values.prompt_ar || values.prompt,
      type: values.type,
      is_required: values.is_required,
      is_critical: values.is_critical,
      weight: values.weight,
      instructions: values.instructions,
      min_value: values.min_value,
      max_value: values.max_value,
      unit: values.unit,
      options: values.options,
      polarity: values.polarity,
      require_photo_on_fail: values.require_photo_on_fail,
      require_comment_on_fail: values.require_comment_on_fail,
      require_capa_on_fail: values.require_capa_on_fail,
    })
    .eq("id", questionId);
  revalidatePath(`/templates/${templateId}`);
  return error ? { error: error.message } : { ok: true };
}

export async function deleteQuestion(templateId: string, questionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("template_questions").delete().eq("id", questionId);
  revalidatePath(`/templates/${templateId}`);
  return error ? { error: error.message } : { ok: true };
}
