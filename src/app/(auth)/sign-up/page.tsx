"use client";

import { useActionState } from "react";
import Link from "next/link";

import { signUp, type ActionResult } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: ActionResult = {};

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">إنشاء حساب جديد</CardTitle>
        <CardDescription>سيصبح حسابك هذا مديرًا عامًا لمصنعك بعد إنشاء المنظمة</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full_name">الاسم الكامل</Label>
            <Input id="full_name" name="full_name" placeholder="محمد العتيبي" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input id="email" name="email" type="email" placeholder="name@company.com" autoComplete="email" required dir="ltr" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required dir="ltr" />
            <p className="text-xs text-muted-foreground">8 أحرف على الأقل</p>
          </div>
          {state?.error && (
            <p className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">{state.error}</p>
          )}
          <Button type="submit" disabled={pending} className="mt-1">
            {pending ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
