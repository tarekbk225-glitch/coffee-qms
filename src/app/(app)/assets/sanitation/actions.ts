"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import type { SanitationStationStatus, SanitationStationType, PestActivityLevel, SanitationCondition } from "@/types/database";

export interface ActionResult {
  error?: string;
  ok?: boolean;
  id?: string;
}

function slugCode(input: string, prefix: string) {
  return (
    input
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9؀-ۿ\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 30) || `${prefix}-${Date.now()}`
  );
}

export async function createStation(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await getSessionContext();
  if (!session?.activeOrgId) return { error: "لا توجد منظمة نشطة" };

  const name = String(formData.get("name") ?? "").trim();
  const nameAr = String(formData.get("name_ar") ?? "").trim();
  const siteId = (formData.get("site_id") as string) || "";
  const areaId = (formData.get("area_id") as string) || null;
  const departmentId = (formData.get("department_id") as string) || null;
  const stationCodeRaw = String(formData.get("station_code") ?? "").trim();
  const stationType = (String(formData.get("station_type") ?? "bait_station") || "bait_station") as SanitationStationType;
  const targetPest = String(formData.get("target_pest") ?? "").trim() || null;
  const installationDate = (formData.get("installation_date") as string) || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name && !nameAr) return { error: "الرجاء إدخال اسم المحطة" };
  if (!siteId) return { error: "الرجاء اختيار الموقع" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sanitation_stations")
    .insert({
      organization_id: session.activeOrgId,
      site_id: siteId,
      area_id: areaId,
      department_id: departmentId,
      station_code: slugCode(stationCodeRaw || name || nameAr, "STN"),
      name: name || nameAr,
      name_ar: nameAr || name,
      station_type: stationType,
      target_pest: targetPest,
      installation_date: installationDate,
      notes,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "تعذر إنشاء المحطة: " + (error?.message ?? "") };

  revalidatePath("/sanitation");
  redirect(`/sanitation/${data.id}`);
}

export async function updateStation(stationId: string, formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const nameAr = String(formData.get("name_ar") ?? "").trim();
  const areaId = (formData.get("area_id") as string) || null;
  const departmentId = (formData.get("department_id") as string) || null;
  const stationType = (formData.get("station_type") as string) || undefined;
  const targetPest = String(formData.get("target_pest") ?? "").trim() || null;
  const installationDate = (formData.get("installation_date") as string) || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("sanitation_stations")
    .update({
      name: name || undefined,
      name_ar: nameAr || undefined,
      area_id: areaId,
      department_id: departmentId,
      target_pest: targetPest,
      installation_date: installationDate,
      notes,
      ...(stationType ? { station_type: stationType as SanitationStationType } : {}),
    })
    .eq("id", stationId);

  revalidatePath(`/sanitation/${stationId}`);
  return error ? { error: error.message } : { ok: true };
}

export async function changeStationStatus(stationId: string, status: SanitationStationStatus): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("sanitation_stations").update({ status }).eq("id", stationId);
  revalidatePath(`/sanitation/${stationId}`);
  revalidatePath("/sanitation");
  return error ? { error: error.message } : { ok: true };
}

export async function createCheck(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await getSessionContext();
  if (!session?.activeOrgId) return { error: "لا توجد منظمة نشطة" };

  const stationId = String(formData.get("station_id") ?? "");
  const siteId = String(formData.get("site_id") ?? "");
  const activityLevel = (String(formData.get("activity_level") ?? "none") || "none") as PestActivityLevel;
  const pestTypeObserved = String(formData.get("pest_type_observed") ?? "").trim() || null;
  const cleanlinessRaw = String(formData.get("cleanliness_status") ?? "").trim();
  const cleanlinessStatus = (cleanlinessRaw || null) as SanitationCondition | null;
  const chemicalUsed = String(formData.get("chemical_used") ?? "").trim() || null;
  const correctiveAction = String(formData.get("corrective_action") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!stationId || !siteId) return { error: "بيانات المحطة غير مكتملة" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sanitation_checks")
    .insert({
      organization_id: session.activeOrgId,
      site_id: siteId,
      station_id: stationId,
      checked_by: session.userId,
      activity_level: activityLevel,
      pest_type_observed: pestTypeObserved,
      cleanliness_status: cleanlinessStatus,
      chemical_used: chemicalUsed,
      corrective_action: correctiveAction,
      notes,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "تعذر تسجيل الفحص: " + (error?.message ?? "") };

  revalidatePath(`/sanitation/${stationId}`);
  revalidatePath("/sanitation/checks");
  revalidatePath("/findings");
  revalidatePath("/dashboard");
  return { ok: true, id: data.id };
}
