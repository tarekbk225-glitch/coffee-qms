"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import type { InspectionStatus } from "@/types/database";

export interface ActionResult {
  error?: string;
  ok?: boolean;
}

export async function scheduleInspection(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await getSessionContext();
  if (!session?.activeOrgId) return { error: "لا توجد منظمة نشطة" };

  const templateId = String(formData.get("template_id") ?? "");
  const siteId = String(formData.get("site_id") ?? "");
  const departmentId = (formData.get("department_id") as string) || null;
  const areaId = (formData.get("area_id") as string) || null;
  const inspectorId = (formData.get("inspector_id") as string) || null;
  const scheduledDate = String(formData.get("scheduled_date") ?? "") || new Date().toISOString().slice(0, 10);

  if (!templateId || !siteId) return { error: "الرجاء اختيار القالب والموقع" };

  const supabase = await createClient();
  const { data: template } = await supabase.from("templates").select("version").eq("id", templateId).maybeSingle();
  if (!template) return { error: "القالب غير موجود" };

  const { data, error } = await supabase
    .from("inspections")
    .insert({
      organization_id: session.activeOrgId,
      site_id: siteId,
      department_id: departmentId,
      area_id: areaId,
      template_id: templateId,
      template_version: template.version,
      inspector_id: inspectorId,
      scheduled_date: scheduledDate,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "تعذر جدولة التفتيش: " + (error?.message ?? "") };
  redirect(`/inspections/${data.id}`);
}

export async function changeInspectionStatus(inspectionId: string, status: InspectionStatus): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("inspections").update({ status }).eq("id", inspectionId);
  revalidatePath(`/inspections/${inspectionId}`);
  revalidatePath("/inspections");
  revalidatePath("/dashboard");
  return error ? { error: error.message } : { ok: true };
}

export interface AnswerPayload {
  question_id: string;
  section_id: string;
  value_bool?: boolean | null;
  value_number?: number | null;
  value_text?: string | null;
  value_option?: unknown;
  value_date?: string | null;
  value_time?: string | null;
  comment?: string | null;
}

export interface SaveAnswerResult extends ActionResult {
  answerId?: string;
  status?: string;
}

export async function saveAnswer(inspectionId: string, payload: AnswerPayload): Promise<SaveAnswerResult> {
  const session = await getSessionContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inspection_answers")
    .upsert(
      {
        inspection_id: inspectionId,
        question_id: payload.question_id,
        section_id: payload.section_id,
        value_bool: payload.value_bool ?? null,
        value_number: payload.value_number ?? null,
        value_text: payload.value_text ?? null,
        value_option: (payload.value_option as never) ?? null,
        value_date: payload.value_date ?? null,
        value_time: payload.value_time ?? null,
        comment: payload.comment ?? null,
        answered_by: session?.userId,
      },
      { onConflict: "inspection_id,question_id" }
    )
    .select("id, status")
    .single();

  revalidatePath(`/inspections/${inspectionId}`);
  return error ? { error: error.message } : { ok: true, answerId: data?.id, status: data?.status };
}

export async function updateInspectionComments(inspectionId: string, comments: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("inspections").update({ comments }).eq("id", inspectionId);
  revalidatePath(`/inspections/${inspectionId}`);
  return error ? { error: error.message } : { ok: true };
}
