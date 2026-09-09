import Link from "next/link";
import { History, ShieldOff } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { canAny, PERMISSIONS } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { auditActionLabels, auditEntityLabel, badgeToneForAuditAction } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { AuditFilters } from "./audit-filters";
import { AuditRowDetail } from "./audit-row-detail";
import type { AuditAction } from "@/types/database";

const ENTITY_ROUTES: Record<string, string> = {
  findings: "/findings",
  capas: "/capas",
  inspections: "/inspections",
  templates: "/templates",
  assets: "/assets",
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; action?: string }>;
}) {
  const { entity, action } = await searchParams;
  const session = await getSessionContext();
  const canView = canAny(session!.permissions, [PERMISSIONS.REPORT_VIEW, PERMISSIONS.REPORT_VIEW_ORG]);

  if (!canView) {
    return (
      <div>
        <PageHeader title="سجل التدقيق" description="سجل غير قابل للتعديل لكل إجراء جوهري في النظام" />
        <EmptyState
          icon={ShieldOff}
          title="لا تملك صلاحية عرض سجل التدقيق"
          description="هذه الصفحة تتطلب صلاحية report.view أو report.view.org. تواصل مع مسؤول النظام إن كنت بحاجة إلى الوصول."
        />
      </div>
    );
  }

  const supabase = await createClient();
  let query = supabase
    .from("audit_log")
    .select("id, entity_type, entity_id, action, actor_name, old_value, new_value, note, created_at")
    .eq("organization_id", session!.activeOrgId!)
    .order("created_at", { ascending: false })
    .limit(300);

  if (entity) query = query.eq("entity_type", entity);
  if (action) query = query.eq("action", action as AuditAction);

  const { data: rows } = await query;

  return (
    <div>
      <PageHeader
        title="سجل التدقيق"
        description="سجل غير قابل للتعديل لكل إجراء جوهري: من قام به، متى، وماذا تغيّر. لا يوجد حذف صامت لأي سجل."
      />

      <AuditFilters entity={entity ?? "all"} action={action ?? "all"} />

      {!rows || rows.length === 0 ? (
        <EmptyState icon={History} title="لا توجد سجلات مطابقة" description="جرّب تغيير عوامل التصفية أعلاه." />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ والوقت</TableHead>
                <TableHead>السجل</TableHead>
                <TableHead>الإجراء</TableHead>
                <TableHead>المستخدم</TableHead>
                <TableHead>ملاحظة</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const route = ENTITY_ROUTES[r.entity_type];
                return (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(r.created_at)}</TableCell>
                    <TableCell>
                      {route ? (
                        <Link href={`${route}/${r.entity_id}`} className="hover:underline">
                          {auditEntityLabel(r.entity_type)}
                        </Link>
                      ) : (
                        auditEntityLabel(r.entity_type)
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badgeToneForAuditAction(r.action)}>{auditActionLabels[r.action].ar}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.actor_name ?? "النظام"}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{r.note ?? "—"}</TableCell>
                    <TableCell>
                      <AuditRowDetail
                        oldValue={r.old_value as Record<string, unknown> | null}
                        newValue={r.new_value as Record<string, unknown> | null}
                        note={r.note}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
