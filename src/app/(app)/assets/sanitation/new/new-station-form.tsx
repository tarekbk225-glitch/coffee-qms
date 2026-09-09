"use client";

import { useActionState, useState } from "react";

import { createStation, type ActionResult } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { sanitationStationTypeLabels } from "@/lib/labels";

const initialState: ActionResult = {};

interface Option {
  id: string;
  name: string;
  name_ar?: string | null;
  site_id?: string;
}

export function NewStationForm({ sites, departments, areas }: { sites: Option[]; departments: Option[]; areas: Option[] }) {
  const [state, formAction, pending] = useActionState(createStation, initialState);
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name_ar">اسم المحطة (بالعربية)</Label>
              <Input id="name_ar" name="name_ar" placeholder="محطة طعم - مدخل المخزن" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">الاسم بالإنجليزية (اختياري)</Label>
              <Input id="name" name="name" dir="ltr" placeholder="Bait Station - Warehouse Entrance" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="station_code">رمز المحطة (اختياري)</Label>
              <Input id="station_code" name="station_code" dir="ltr" placeholder="سيتم توليده تلقائيًا إن تُرك فارغًا" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="station_type">نوع المحطة</Label>
              <Select name="station_type" defaultValue="bait_station">
                <SelectTrigger id="station_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(sanitationStationTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label.ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              <Label htmlFor="target_pest">الآفة المستهدفة (اختياري)</Label>
              <Input id="target_pest" name="target_pest" placeholder="قوارض / صراصير / ذباب ..." />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="installation_date">تاريخ التركيب</Label>
              <Input id="installation_date" name="installation_date" type="date" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>

          {state?.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "جارٍ الحفظ..." : "حفظ المحطة"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
