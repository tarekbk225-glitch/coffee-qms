"use client";

import { useActionState, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { createDocument, extractDocumentFieldsAction, type ActionResult } from "../actions";
import type { ExtractedDocumentFields } from "@/lib/document-extraction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { documentTypeLabels } from "@/lib/labels";

const initialState: ActionResult = {};

interface Option {
  id: string;
  name: string;
  name_ar?: string | null;
}

export function NewDocumentForm({ departments }: { departments: Option[] }) {
  const [state, formAction, pending] = useActionState(createDocument, initialState);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedDocumentFields | null>(null);
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
      const res = await extractDocumentFieldsAction(fd);
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
          <Label htmlFor="document_file" className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" />
            إرفاق ملف المستند (اختياري) - يملأ الحقول تلقائيًا بالذكاء الاصطناعي
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              id="document_file"
              name="document_file"
              type="file"
              accept="application/pdf,image/*"
              form="new-document-form"
              className="text-sm text-muted-foreground file:me-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm"
            />
            <Button type="button" variant="outline" size="sm" disabled={extracting} onClick={analyzeFile}>
              {extracting ? "جارٍ التحليل..." : "تحليل الملف تلقائيًا"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            سيُرفق هذا الملف تلقائيًا كنسخة من المستند عند الحفظ. راجع البيانات المُستخرجة دائمًا قبل الحفظ فقد تحتوي على أخطاء.
          </p>
        </div>

        <form id="new-document-form" action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title_ar">عنوان المستند (بالعربية)</Label>
              <Input
                key={`title_ar-${version}`}
                id="title_ar"
                name="title_ar"
                placeholder="إجراء نظافة خط التعبئة"
                defaultValue={extracted?.title_ar ?? ""}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">العنوان بالإنجليزية (اختياري)</Label>
              <Input
                key={`title-${version}`}
                id="title"
                name="title"
                dir="ltr"
                placeholder="Packing Line Cleaning Procedure"
                defaultValue={extracted?.title ?? ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="document_type">نوع المستند</Label>
              <Select key={`type-${version}`} name="document_type" defaultValue={extracted?.document_type ?? "sop"}>
                <SelectTrigger id="document_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(documentTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label.ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="department_id">القسم (اختياري)</Label>
              <Select name="department_id">
                <SelectTrigger id="department_id">
                  <SelectValue placeholder="بدون تحديد" />
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
            <Label htmlFor="review_date">موعد المراجعة القادم (اختياري)</Label>
            <Input id="review_date" name="review_date" type="date" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea key={`notes-${version}`} id="notes" name="notes" rows={3} defaultValue={extracted?.notes ?? ""} />
          </div>

          {state?.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "جارٍ الحفظ..." : "حفظ المستند"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
