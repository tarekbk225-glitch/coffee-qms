"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import type { SiteType } from "@/types/database";

export interface ActionResult {
  error?: string;
  ok?: boolean;
}

export async function updateOrganization(formData: FormData): Promise<ActionResult> {
  const session = await getSessionContext();
  if (!session?.activeOrgId) return { error: "لا توجد منظمة نشطة" };

  const name = String(formData.get("name") ?? "").trim();
  const nameAr = String(formData.get("name_ar") ?? "").trim();
  if (!nameAr && !name) return { error: "الرجاء إدخال اسم المنظمة" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ name: name || undefined, name_ar: nameAr || undefined })
    .eq("id", session.activeOrgId);

  revalidatePath("/settings");
  return error ? { error: error.message } : { ok: true };
}

export async function createSite(formData: FormData): Promise<ActionResult> {
  const session = await getSessionContext();
  if (!session?.activeOrgId) return { error: "لا توجد منظمة نشطة" };

  const name = String(formData.get("name") ?? "").trim();
  const nameAr = String(formData.get("name_ar") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const type = (String(formData.get("type") ?? "factory") || "factory") as SiteType;
  const city = String(formData.get("city") ?? "").trim() || null;

  if ((!name && !nameAr) || !code) return { error: "الرجاء إدخال اسم الموقع ورمزه" };

  const supabase = await createClient();
  const { error } = await supabase.from("sites").insert({
    organization_id: session.activeOrgId,
    name: name || nameAr,
    name_ar: nameAr || name,
    code,
    type,
    city,
    created_by: session.userId,
  });

  revalidatePath("/settings");
  if (error) {
    if (error.code === "23505") return { error: "رمز الموقع مستخدم بالفعل في هذه المنظمة." };
    return { error: "تعذر إنشاء الموقع: " + error.message };
  }
  return { ok: true };
}

export async function updateSite(siteId: string, formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const nameAr = String(formData.get("name_ar") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim() || null;
  const isActive = formData.get("is_active") === "on";

  const supabase = await createClient();
  const { error } = await supabase
    .from("sites")
    .update({ name: name || undefined, name_ar: nameAr || undefined, city, is_active: isActive })
    .eq("id", siteId);

  revalidatePath("/settings");
  return error ? { error: error.message } : { ok: true };
}

export async function createDepartment(formData: FormData): Promise<ActionResult> {
  const session = await getSessionContext();
  if (!session?.activeOrgId) return { error: "لا توجد منظمة نشطة" };

  const name = String(formData.get("name") ?? "").trim();
  const nameAr = String(formData.get("name_ar") ?? "").trim();
  const siteId = String(formData.get("site_id") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim() || null;

  if ((!name && !nameAr) || !siteId) return { error: "الرجاء إدخال اسم القسم واختيار الموقع" };

  const supabase = await createClient();
  const { error } = await supabase.from("departments").insert({
    organization_id: session.activeOrgId,
    site_id: siteId,
    name: name || nameAr,
    name_ar: nameAr || name,
    code,
    created_by: session.userId,
  });

  revalidatePath("/settings");
  if (error) {
    if (error.code === "23505") return { error: "يوجد قسم بنفس الاسم في هذا الموقع بالفعل." };
    return { error: "تعذر إنشاء القسم: " + error.message };
  }
  return { ok: true };
}

export async function updateDepartment(departmentId: string, formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const nameAr = String(formData.get("name_ar") ?? "").trim();
  const isActive = formData.get("is_active") === "on";

  const supabase = await createClient();
  const { error } = await supabase
    .from("departments")
    .update({ name: name || undefined, name_ar: nameAr || undefined, is_active: isActive })
    .eq("id", departmentId);

  revalidatePath("/settings");
  return error ? { error: error.message } : { ok: true };
}

/**
 * Adds an EXISTING platform user (one who already has a profiles row from
 * signing up) to the active organization. Creating a brand-new user account
 * on an admin's behalf requires Supabase's Admin API (a service-role key),
 * which this browser/RLS-only app intentionally does not hold - see the
 * "future functionality" note surfaced in the UI for that case.
 */
export async function addMemberByEmail(formData: FormData): Promise<ActionResult> {
  const session = await getSessionContext();
  if (!session?.activeOrgId) return { error: "لا توجد منظمة نشطة" };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleId = String(formData.get("role_id") ?? "").trim();
  const siteId = (formData.get("site_id") as string) || null;
  if (!email || !roleId) return { error: "الرجاء إدخال البريد الإلكتروني واختيار الدور" };

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();

  if (!profile) {
    return {
      error:
        "لا يوجد حساب بهذا البريد الإلكتروني بعد. اطلب من الشخص إنشاء حساب من صفحة (إنشاء حساب جديد) أولًا، ثم أضِفه هنا.",
    };
  }

  const { error } = await supabase.from("memberships").insert({
    organization_id: session.activeOrgId,
    user_id: profile.id,
    role_id: roleId,
    site_id: siteId,
    invited_by: session.userId,
  });

  revalidatePath("/settings");
  if (error) {
    if (error.code === "23505") return { error: "هذا المستخدم عضو بالفعل في هذه المنظمة/الموقع." };
    return { error: "تعذر إضافة العضو: " + error.message };
  }
  return { ok: true };
}

export async function updateMembership(
  membershipId: string,
  patch: { role_id?: string; site_id?: string | null; is_active?: boolean }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("memberships").update(patch).eq("id", membershipId);
  revalidatePath("/settings");
  return error ? { error: error.message } : { ok: true };
}

export async function removeMembership(membershipId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("memberships").delete().eq("id", membershipId);
  revalidatePath("/settings");
  return error ? { error: error.message } : { ok: true };
}
