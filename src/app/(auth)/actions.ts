"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  error?: string;
}

export async function signIn(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!email || !password) return { error: "الرجاء إدخال البريد الإلكتروني وكلمة المرور" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "بيانات الدخول غير صحيحة. حاول مرة أخرى." };
  }

  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signUp(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!email || !password || password.length < 8) {
    return { error: "الرجاء إدخال بريد إلكتروني وكلمة مرور مكوّنة من 8 أحرف على الأقل" };
  }

  const supabase = await createClient();
  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    return { error: error.message === "User already registered" ? "هذا البريد الإلكتروني مسجّل مسبقًا" : "تعذر إنشاء الحساب. حاول مرة أخرى." };
  }

  if (data.session) {
    redirect("/onboarding");
  }

  return { error: "تم إنشاء الحساب. إذا كان تأكيد البريد الإلكتروني مفعّلاً، يرجى تفقد بريدك قبل تسجيل الدخول." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
