"use client";

import { useActionState, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { createCertificate, extractCertificateFieldsAction, type ActionResult } from "../../actions";
import type { ExtractedCertificateFields } from "@/lib/document-extraction";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedCertificateFields | null>(null);
  // Bumped every time extraction succeeds, so the (uncontrolled) fields
  // below remount and pick up their new defaultValue from `extracted`.
  const [version, setVersion] = useState(0);

  async function analyzeFile() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("الرجاء اختيار ملف أولاً");
      return;
    }
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await extractCertificateFieldsAction(fd);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setExtracted(res.data ?? null);
      setVersion((v) => v + 1);
      toast.success("تم تعبئة البيانات من الملف - راجعها قبل الحفظ");
    } finally {
      setExtracting(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 pt-6">
        <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
          <Label htmlFor="certificate_file" className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" />
            إرفاق ملف الشهادة (اختياري) - يملأ الحقول تلقائيًا بالذكاء الاصطناعي
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              id="certificate_file"
              name="certificate_file"
              type="file"
              accept="application/pdf,image/*"
              form="new-certificate-form"
              className="text-sm text-muted-foreground file:me-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm"
            />
            <Button type="button" variant="outline" size="sm" disabled={extracting} onClick={analyzeFile}>
              {extracting ? "جارٍ التحليل..." : "تحليل الملف تلقائيًا"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            سيُرفق هذا الملف تلقائيًا كنسخة من الشهادة عند الحفظ. راجع البيانات المُستخرجة دائمًا قبل الحفظ فقد تحتوي على أخطاء.
          </p>
        </div>

        <form id="new-certificate-form" action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name_ar">اسم الشهادة / الترخيص (بالعربية)</Label>
              <Input
                key={`name_ar-${version}`}
                id="name_ar"
                name="name_ar"
                placeholder="شهادة الصلاحية البلدية"
                defaultValue={extracted?.name_ar ?? ""}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">الاسم بالإنجليزية (اختياري)</Label>
              <Input
                key={`name-${version}`}
                id="name"
                name="name"
                dir="ltr"
                placeholder="Municipality Operating License"
                defaultValue={extracted?.name ?? ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="certificate_type">النوع</Label>
              <Select key={`type-${version}`} name="certificate_type" defaultValue={extracted?.certificate_type ?? "municipality_license"}>
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
            <Input
              key={`issuing_authority-${version}`}
              id="issuing_authority"
              name="issuing_authority"
              placeholder="بلدية المنطقة / وزارة الصحة ..."
              defaultValue={extracted?.issuing_authority ?? ""}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="external_reference">الرقم الرسمي للشهادة (اختياري)</Label>
            <Input
              key={`external_reference-${version}`}
              id="external_reference"
              name="external_reference"
              dir="ltr"
              defaultValue={extracted?.external_reference ?? ""}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="issue_date">تاريخ الإصدار</Label>
              <Input
                key={`issue_date-${version}`}
                id="issue_date"
                name="issue_date"
                type="date"
                defaultValue={extracted?.issue_date ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expiry_date">تاريخ الانتهاء</Label>
              <Input
                key={`expiry_date-${version}`}
                id="expiry_date"
                name="expiry_date"
                type="date"
                defaultValue={extracted?.expiry_date ?? ""}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea key={`notes-${version}`} id="notes" name="notes" rows={3} defaultValue={extracted?.notes ?? ""} />
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
