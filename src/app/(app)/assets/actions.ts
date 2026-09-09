"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import type { AssetCriticality, AssetStatus } from "@/types/database";

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
      .slice(0, 30) || `AST-${Date.now()}`
  );
}

export async function createAsset(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await getSessionContext();
  if (!session?.activeOrgId) return { error: "لا توجد منظمة نشطة" };

  const name = String(formData.get("name") ?? "").trim();
  const nameAr = String(formData.get("name_ar") ?? "").trim();
  const siteId = (formData.get("site_id") as string) || "";
  const areaId = (formData.get("area_id") as string) || null;
  const departmentId = (formData.get("department_id") as string) || null;
  const assetCodeRaw = String(formData.get("asset_code") ?? "").trim();
  const category = String(formData.get("category") ?? "general").trim() || "general";
  const manufacturer = String(formData.get("manufacturer") ?? "").trim() || null;
  const model = String(formData.get("model") ?? "").trim() || null;
  const serialNumber = String(formData.get("serial_number") ?? "").trim() || null;
  const installationDate = (formData.get("installation_date") as string) || null;
  const warrantyExpiry = (formData.get("warranty_expiry") as string) || null;
  const criticality = (String(formData.get("criticality") ?? "medium") || "medium") as AssetCriticality;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name && !nameAr) return { error: "الرجاء إدخال اسم الأصل" };
  if (!siteId) return { error: "الرجاء اختيار الموقع" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assets")
    .insert({
      organization_id: session.activeOrgId,
      site_id: siteId,
      area_id: areaId,
      department_id: departmentId,
      asset_code: slugCode(assetCodeRaw || name || nameAr),
      name: name || nameAr,
      name_ar: nameAr || name,
      category,
      manufacturer,
      model,
      serial_number: serialNumber,
      installation_date: installationDate,
      warranty_expiry: warrantyExpiry,
      criticality,
      notes,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "تعذر إنشاء الأصل: " + (error?.message ?? "") };

  revalidatePath("/assets");
  redirect(`/assets/${data.id}`);
}

export async function updateAsset(assetId: string, formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const nameAr = String(formData.get("name_ar") ?? "").trim();
  const areaId = (formData.get("area_id") as string) || null;
  const departmentId = (formData.get("department_id") as string) || null;
  const category = String(formData.get("category") ?? "").trim() || "general";
  const manufacturer = String(formData.get("manufacturer") ?? "").trim() || null;
  const model = String(formData.get("model") ?? "").trim() || null;
  const serialNumber = String(formData.get("serial_number") ?? "").trim() || null;
  const installationDate = (formData.get("installation_date") as string) || null;
  const warrantyExpiry = (formData.get("warranty_expiry") as string) || null;
  const criticality = (formData.get("criticality") as string) || undefined;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("assets")
    .update({
      name: name || undefined,
      name_ar: nameAr || undefined,
      area_id: areaId,
      department_id: departmentId,
      category,
      manufacturer,
      model,
      serial_number: serialNumber,
      installation_date: installationDate,
      warranty_expiry: warrantyExpiry,
      notes,
      ...(criticality ? { criticality: criticality as AssetCriticality } : {}),
    })
    .eq("id", assetId);

  revalidatePath(`/assets/${assetId}`);
  return error ? { error: error.message } : { ok: true };
}

export async function changeAssetStatus(assetId: string, status: AssetStatus): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("assets").update({ status }).eq("id", assetId);
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  return error ? { error: error.message } : { ok: true };
}
