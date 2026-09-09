"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/(auth)/actions";

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export async function createOrganizationAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const nameAr = String(formData.get("name_ar") ?? "").trim();
  const nameEn = String(formData.get("name_en") ?? "").trim();
  const siteName = String(formData.get("site_name") ?? "").trim() || "الموقع الرئيسي";

  if (!nameAr) return { error: "الرجاء إدخال اسم المصنع" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const slug = slugify(nameEn || nameAr) || `factory-${Date.now()}`;

  const { error } = await supabase.rpc("create_organization", {
    p_name: nameEn || nameAr,
    p_name_ar: nameAr,
    p_slug: slug,
    p_site_name: siteName,
  });

  if (error) {
    return { error: "تعذر إنشاء المنظمة. جرّب اسمًا مختلفًا." };
  }

  redirect("/dashboard");
}
