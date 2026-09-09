"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { signIn, type ActionResult } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: ActionResult = {};

function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">تسجيل الدخول</CardTitle>
        <CardDescription>ادخل إلى حسابك لمتابعة عمليات الجودة اليومية</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input id="email" name="email" type="email" placeholder="name@company.com" autoComplete="email" required dir="ltr" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required dir="ltr" />
          </div>
          {state?.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" disabled={pending} className="mt-1">
            {pending ? "جارٍ الدخول..." : "دخول"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          ليس لديك حساب؟{" "}
          <Link href="/sign-up" className="font-medium text-accent hover:underline">
            إنشاء حساب جديد
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Card className="w-full max-w-sm"><CardContent className="pt-6 text-sm text-muted-foreground">جارٍ التحميل...</CardContent></Card>}>
      <LoginForm />
    </Suspense>
  );
}
