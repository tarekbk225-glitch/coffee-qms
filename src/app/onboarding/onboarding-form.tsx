"use client";

import { useActionState } from "react";

import { createOrganizationAction } from "./actions";
import type { ActionResult } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: ActionResult = {};

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(createOrganizationAction, initialState);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">إنشاء المصنع</CardTitle>
        <CardDescription>
          سننشئ لك تلقائيًا الموقع الرئيسي وتُعيَّن كمدير عام (Super Admin) للنظام
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name_ar">اسم المصنع (بالعربية)</Label>
            <Input id="name_ar" name="name_ar" placeholder="مصنع القهوة التجريبي" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name_en">الاسم بالإنجليزية (اختياري)</Label>
            <Input id="name_en" name="name_en" placeholder="Demo Coffee Factory" dir="ltr" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="site_name">اسم الموقع الرئيسي</Label>
            <Input id="site_name" name="site_name" placeholder="المصنع الرئيسي" />
          </div>
          {state?.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" disabled={pending} className="mt-1">
            {pending ? "جارٍ الإنشاء..." : "إنشاء المصنع والمتابعة"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
