"use client";

import { useActionState } from "react";

import { createDocument, type ActionResult } from "../actions";
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

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title_ar">عنوان المستند (بالعربية)</Label>
              <Input id="title_ar" name="title_ar" placeholder="إجراء نظافة خط التعبئة" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">العنوان بالإنجليزية (اختياري)</Label>
              <Input id="title" name="title" dir="ltr" placeholder="Packing Line Cleaning Procedure" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="document_type">نوع المستند</Label>
              <Select name="document_type" defaultValue="sop">
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
            <Textarea id="notes" name="notes" rows={3} />
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
