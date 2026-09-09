"use client";

import { useState } from "react";
import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

function diffEntries(oldValue: Record<string, unknown> | null, newValue: Record<string, unknown> | null) {
  const keys = new Set([...Object.keys(oldValue ?? {}), ...Object.keys(newValue ?? {})]);
  const rows: { key: string; before: unknown; after: unknown }[] = [];
  for (const key of keys) {
    const before = oldValue?.[key];
    const after = newValue?.[key];
    if (JSON.stringify(before) !== JSON.stringify(after)) rows.push({ key, before, after });
  }
  return rows.sort((a, b) => a.key.localeCompare(b.key));
}

function fmt(v: unknown) {
  if (v === undefined) return "—";
  if (v === null) return "فارغ";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function AuditRowDetail({
  oldValue,
  newValue,
  note,
}: {
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  note: string | null;
}) {
  const [open, setOpen] = useState(false);
  const rows = diffEntries(oldValue, newValue);

  if (rows.length === 0 && !note) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Eye className="h-3.5 w-3.5" /> التفاصيل
      </Button>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>تفاصيل التغيير</DialogTitle>
          <DialogDescription>مقارنة القيم قبل وبعد هذا الإجراء</DialogDescription>
        </DialogHeader>
        {note && <p className="rounded-md bg-muted px-3 py-2 text-sm">{note}</p>}
        <ScrollArea className="max-h-96">
          <div className="flex flex-col gap-2 pe-3">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد حقول متغيرة مسجّلة.</p>
            ) : (
              rows.map((r) => (
                <div key={r.key} className="rounded-md border p-2 text-xs">
                  <p className="mb-1 font-medium" dir="ltr">
                    {r.key}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-muted-foreground">قبل</p>
                      <p className="break-all text-destructive">{fmt(r.before)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">بعد</p>
                      <p className="break-all text-emerald-600 dark:text-emerald-400">{fmt(r.after)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
