"use client";

import { useActionState } from "react";

import { createCertificate, type ActionResult } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { certificateTypeLabels } from "@/lib/labels";

const initialState: ActionResult = {};

interface Option {
  id: string;
  name: string;
  name_ar?: string | null;
}

export function NewCertificateForm({ sites }: { sites: Option[] }) {
  const [state, formAction, pending] = useActionState(createCertificate, initialState);

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name_ar">اسم الشهادة / الترخيص (بالعربية)</Label>
              <Input id="name_ar" name="name_ar" placeholder="شهادة الصلاحية البلدية" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">الاسم بالإنجليزية (اختياري)</Label>
              <Input id="name" name="name" dir="ltr" placeholder="Municipality Operating License" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="certificate_type">النوع</Label>
              <Select name="certificate_type" defaultValue="municipality_license">
                <SelectTrigger id="certificate_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(certificateTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label.ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="site_id">الموقع (اختياري)</Label>
              <Select name="site_id">
                <SelectTrigger id="site_id">
                  <SelectValue placeholder="على مستوى المنظمة" />
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
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="issuing_authority">الجهة المُصدرة</Label>
            <Input id="issuing_authority" name="issuing_authority" placeholder="بلدية المنطقة / وزارة الصحة ..." />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="external_reference">الرقم الرسمي للشهادة (اختياري)</Label>
            <Input id="external_reference" name="external_reference" dir="ltr" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="issue_date">تاريخ الإصدار</Label>
              <Input id="issue_date" name="issue_date" type="date" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expiry_date">تاريخ الانتهاء</Label>
              <Input id="expiry_date" name="expiry_date" type="date" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>

          {state?.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
