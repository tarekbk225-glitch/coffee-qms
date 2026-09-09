"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import type { FindingStatus } from "@/types/database";

export interface ActionResult {
  error?: string;
  ok?: boolean;
  id?: string;
}

export async function changeFindingStatus(findingId: string, status: FindingStatus): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("findings").update({ status }).eq("id", findingId);
  revalidatePath(`/findings/${findingId}`);
  revalidatePath("/findings");
  revalidatePath("/dashboard");
  return error ? { error: error.message } : { ok: true };
}

export async function assignFinding(findingId: string, userId: string | null): Promise<ActionResult> {
  const supabase = await createClient();
  const patch: { assigned_to: string | null; status?: FindingStatus } = { assigned_to: userId };
  if (userId) {
    const { data } = await supabase.from("findings").select("status").eq("id", findingId).maybeSingle();
    if (data?.status === "open") patch.status = "assigned";
  }
  const { error } = await supabase.from("findings").update(patch).eq("id", findingId);
  revalidatePath(`/findings/${findingId}`);
  return error ? { error: error.message } : { ok: true };
}

export async function updateFindingFields(findingId: string, formData: FormData): Promise<ActionResult> {
  const rootCause = String(formData.get("root_cause") ?? "").trim() || null;
  const immediateAction = String(formData.get("immediate_action") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("findings")
    .update({ root_cause: rootCause, immediate_action: immediateAction, category })
    .eq("id", findingId);
  revalidatePath(`/findings/${findingId}`);
  return error ? { error: error.message } : { ok: true };
}

export async function createCapaFromFinding(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await getSessionContext();
  const findingId = String(formData.get("finding_id") ?? "");
  const siteId = String(formData.get("site_id") ?? "");
  const requiredAction = String(formData.get("required_action") ?? "").trim();
  const problemDescription = String(formData.get("problem_description") ?? "").trim();
  const actionType = String(formData.get("action_type") ?? "corrective");
  const priority = String(formData.get("priority") ?? "medium");
  const assignedTo = (formData.get("assigned_to") as string) || null;
  const dueDate = (formData.get("due_date") as string) || null;

  if (!requiredAction || !problemDescription) return { error: "الرجاء تعبئة وصف المشكلة والإجراء المطلوب" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("capas")
    .insert({
      organization_id: session!.activeOrgId!,
      site_id: siteId,
      finding_id: findingId,
      problem_description: problemDescription,
      action_type: actionType as never,
      required_action: requiredAction,
      assigned_to: assignedTo,
      owner_id: session!.userId,
      priority: priority as never,
      due_date: dueDate,
      created_by: session!.userId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "تعذر إنشاء الإجراء: " + (error?.message ?? "") };

  if (assignedTo) {
    await supabase.from("findings").update({ status: "assigned", assigned_to: assignedTo }).eq("id", findingId).eq("status", "open");
  }

  revalidatePath(`/findings/${findingId}`);
  revalidatePath("/capas");
  return { ok: true, id: data.id };
}
