"use client";

import { useActionState } from "react";

import { createTemplate, type ActionResult } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const initialState: ActionResult = {};

export function NewTemplateForm({ departments }: { departments: { id: string; name: string; name_ar: string | null }[] }) {
  const [state, formAction, pending] = useActionState(createTemplate, initialState);

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name_ar">اسم القالب (بالعربية)</Label>
              <Input id="name_ar" name="name_ar" placeholder="تفتيش النظافة اليومي للإنتاج" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">الاسم بالإنجليزية (اختياري)</Label>
              <Input id="name" name="name" dir="ltr" placeholder="Daily Production Hygiene Inspection" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">الفئة</Label>
              <Input id="category" name="category" placeholder="hygiene / receiving / roasting ..." defaultValue="general" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="department_id">القسم</Label>
              <Select name="department_id">
                <SelectTrigger id="department_id">
                  <SelectValue placeholder="بدون قسم محدد" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name_ar || d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">الوصف</Label>
            <Textarea id="description" name="description" rows={3} placeholder="نطاق التفتيش والغرض منه" />
          </div>
          {state?.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "جارٍ الإنشاء..." : "إنشاء القالب والمتابعة لإضافة الأسئلة"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
