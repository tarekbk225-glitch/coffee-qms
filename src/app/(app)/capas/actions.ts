"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { CapaStatus, FishboneCategory } from "@/types/database";

export interface ActionResult {
  error?: string;
  ok?: boolean;
}

export async function changeCapaStatus(capaId: string, status: CapaStatus, extra?: Record<string, unknown>): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("capas").update({ status, ...extra }).eq("id", capaId);
  revalidatePath(`/capas/${capaId}`);
  revalidatePath("/capas");
  revalidatePath("/dashboard");
  if (error) {
    // Surface the trigger's raw message (e.g. "completion_notes is required...")
    return { error: error.message };
  }
  return { ok: true };
}

export async function updateCapaFields(capaId: string, formData: FormData): Promise<ActionResult> {
  const rootCause = String(formData.get("root_cause") ?? "").trim() || null;
  const assignedTo = (formData.get("assigned_to") as string) || null;
  const dueDate = (formData.get("due_date") as string) || null;
  const priority = String(formData.get("priority") ?? "") || undefined;

  const supabase = await createClient();
  const { error } = await supabase
    .from("capas")
    .update({ root_cause: rootCause, assigned_to: assignedTo, due_date: dueDate, ...(priority ? { priority: priority as never } : {}) })
    .eq("id", capaId);
  revalidatePath(`/capas/${capaId}`);
  return error ? { error: error.message } : { ok: true };
}

export async function saveFiveWhys(capaId: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("capa_five_whys").upsert(
    {
      capa_id: capaId,
      why_1: String(formData.get("why_1") ?? "").trim() || null,
      why_2: String(formData.get("why_2") ?? "").trim() || null,
      why_3: String(formData.get("why_3") ?? "").trim() || null,
      why_4: String(formData.get("why_4") ?? "").trim() || null,
      why_5: String(formData.get("why_5") ?? "").trim() || null,
      final_root_cause: String(formData.get("final_root_cause") ?? "").trim() || null,
    },
    { onConflict: "capa_id" }
  );
  revalidatePath(`/capas/${capaId}`);
  return error ? { error: error.message } : { ok: true };
}

export async function addFishboneCause(capaId: string, category: FishboneCategory, causeText: string): Promise<ActionResult> {
  if (!causeText.trim()) return { error: "الرجاء إدخال السبب" };
  const supabase = await createClient();
  const { error } = await supabase.from("capa_fishbone_causes").insert({ capa_id: capaId, category, cause_text: causeText.trim() });
  revalidatePath(`/capas/${capaId}`);
  return error ? { error: error.message } : { ok: true };
}

export async function deleteFishboneCause(capaId: string, id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("capa_fishbone_causes").delete().eq("id", id);
  revalidatePath(`/capas/${capaId}`);
  return error ? { error: error.message } : { ok: true };
}

export async function submitCapa(capaId: string, completionNotes: string): Promise<ActionResult> {
  if (!completionNotes.trim()) return { error: "الرجاء إدخال ملاحظات الإنجاز قبل الإرسال" };
  return changeCapaStatus(capaId, "submitted", { completion_notes: completionNotes.trim() });
}

export async function rejectCapa(capaId: string, reason: string): Promise<ActionResult> {
  if (!reason.trim()) return { error: "الرجاء إدخال سبب الرفض" };
  return changeCapaStatus(capaId, "rejected", { rejected_reason: reason.trim() });
}

export async function approveCapa(capaId: string, notes: string): Promise<ActionResult> {
  return changeCapaStatus(capaId, "approved", { verification_notes: notes.trim() || null });
}
