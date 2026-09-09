"use client";

import { useRouter, usePathname } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auditActionLabels, auditEntityLabels } from "@/lib/labels";

export function AuditFilters({ entity, action }: { entity: string; action: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function update(next: { entity?: string; action?: string }) {
    const params = new URLSearchParams();
    const nextEntity = next.entity ?? entity;
    const nextAction = next.action ?? action;
    if (nextEntity && nextEntity !== "all") params.set("entity", nextEntity);
    if (nextAction && nextAction !== "all") params.set("action", nextAction);
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Select value={entity || "all"} onValueChange={(v) => update({ entity: v })}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="كل السجلات" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">كل السجلات</SelectItem>
          {Object.entries(auditEntityLabels).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label.ar}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={action || "all"} onValueChange={(v) => update({ action: v })}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="كل الإجراءات" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">كل الإجراءات</SelectItem>
          {Object.entries(auditActionLabels).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label.ar}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
