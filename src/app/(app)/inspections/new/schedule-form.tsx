"use client";

import { useActionState, useState } from "react";

import { scheduleInspection } from "../actions";
import type { ActionResult } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const initialState: ActionResult = {};

interface Option {
  id: string;
  name: string;
  name_ar?: string | null;
  site_id?: string;
}

export function ScheduleInspectionForm({
  templates,
  sites,
  departments,
  areas,
  inspectors,
}: {
  templates: Option[];
  sites: Option[];
  departments: Option[];
  areas: Option[];
  inspectors: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(scheduleInspection, initialState);
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="template_id">قالب التفتيش</Label>
            <Select name="template_id" required>
              <SelectTrigger id="template_id">
                <SelectValue placeholder="اختر القالب" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name_ar || t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="site_id">الموقع</Label>
            <Select name="site_id" value={siteId} onValueChange={setSiteId} required>
              <SelectTrigger id="site_id">
                <SelectValue placeholder="اختر الموقع" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name_ar || s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="department_id">القسم (اختياري)</Label>
              <Select name="department_id">
                <SelectTrigger id="department_id">
                  <SelectValue placeholder="بدون تحديد" />
                </SelectTrigger>
                <SelectContent>
                  {departments
                    .filter((d) => !siteId || d.site_id === siteId)
                    .map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name_ar || d.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="area_id">المنطقة (اختياري)</Label>
              <Select name="area_id">
                <SelectTrigger id="area_id">
                  <SelectValue placeholder="بدون تحديد" />
                </SelectTrigger>
                <SelectContent>
                  {areas
                    .filter((a) => !siteId || a.site_id === siteId)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name_ar || a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inspector_id">المفتش المسؤول</Label>
              <Select name="inspector_id">
                <SelectTrigger id="inspector_id">
                  <SelectValue placeholder="غير مُعيّن" />
                </SelectTrigger>
                <SelectContent>
                  {inspectors.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="scheduled_date">تاريخ التنفيذ</Label>
              <Input id="scheduled_date" name="scheduled_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </div>
          </div>

          {state?.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "جارٍ الجدولة..." : "جدولة التفتيش"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
