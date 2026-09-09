"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { questionTypeLabels } from "@/lib/labels";
import type { QuestionType } from "@/types/database";

const RANGE_TYPES: QuestionType[] = ["number", "decimal", "temperature"];
const CHOICE_TYPES: QuestionType[] = ["dropdown", "multi_select"];

export function QuestionFormFields({ defaults }: { defaults?: Record<string, unknown> }) {
  const [type, setType] = useState<QuestionType>((defaults?.type as QuestionType) ?? "yes_no");

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prompt_ar">نص السؤال (بالعربية)</Label>
          <Textarea id="prompt_ar" name="prompt_ar" rows={2} defaultValue={defaults?.prompt_ar as string} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prompt">بالإنجليزية (اختياري)</Label>
          <Textarea id="prompt" name="prompt" dir="ltr" rows={2} defaultValue={defaults?.prompt as string} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="type">نوع الإجابة</Label>
        <Select name="type" value={type} onValueChange={(v) => setType(v as QuestionType)}>
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(questionTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label.ar}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {type === "yes_no" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="polarity">الإجابة التي تعتبر &quot;مطابقة&quot;</Label>
          <Select name="polarity" defaultValue={(defaults?.polarity as string) ?? "positive"}>
            <SelectTrigger id="polarity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="positive">نعم = مطابق (مثال: هل المكان نظيف؟)</SelectItem>
              <SelectItem value="negative">لا = مطابق (مثال: هل يوجد آفات؟)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {RANGE_TYPES.includes(type) && (
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="min_value">الحد الأدنى</Label>
            <Input id="min_value" name="min_value" type="number" step="any" defaultValue={defaults?.min_value as number} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="max_value">الحد الأعلى</Label>
            <Input id="max_value" name="max_value" type="number" step="any" defaultValue={defaults?.max_value as number} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unit">الوحدة</Label>
            <Input id="unit" name="unit" placeholder="°C" defaultValue={defaults?.unit as string} />
          </div>
        </div>
      )}

      {CHOICE_TYPES.includes(type) && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="options">الخيارات (مفصولة بفاصلة)</Label>
          <Input
            id="options"
            name="options"
            placeholder="ممتاز, جيد, مقبول, ضعيف"
            defaultValue={((defaults?.options as { label: string }[] | undefined)?.map((o) => o.label).join(", ")) ?? ""}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="instructions">تعليمات للمفتش (اختياري)</Label>
        <Textarea id="instructions" name="instructions" rows={2} defaultValue={defaults?.instructions as string} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="is_required" defaultChecked={(defaults?.is_required as boolean) ?? true} /> إلزامي
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="is_critical" defaultChecked={defaults?.is_critical as boolean} /> بند حرج (Critical)
        </label>
        <div className="flex flex-col gap-1">
          <Label htmlFor="weight" className="text-xs text-muted-foreground">الوزن</Label>
          <Input id="weight" name="weight" type="number" step="any" className="h-8" defaultValue={(defaults?.weight as number) ?? 1} />
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">عند الفشل، يتطلب:</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="require_photo_on_fail" defaultChecked={defaults?.require_photo_on_fail as boolean} /> صورة
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="require_comment_on_fail" defaultChecked={(defaults?.require_comment_on_fail as boolean) ?? true} /> تعليق
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="require_capa_on_fail" defaultChecked={(defaults?.require_capa_on_fail as boolean) ?? true} /> إجراء تصحيحي
          </label>
        </div>
      </div>
    </div>
  );
}
