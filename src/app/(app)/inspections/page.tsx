import Link from "next/link";
import { Plus, ClipboardCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inspectionStatusLabels } from "@/lib/labels";
import { formatDate, formatPercent, daysAgoIso } from "@/lib/format";
import { PERMISSIONS, canAny } from "@/lib/permissions";
import type { InspectionStatus } from "@/types/database";

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; status?: string }>;
}) {
  const { scope, status } = await searchParams;
  const session = await getSessionContext();
  const supabase = await createClient();

  let query = supabase
    .from("inspections")
    .select(
      "id, scheduled_date, status, score, compliance_percent, templates(name_ar, name), departments(name_ar, name), profiles!inspections_inspector_id_fkey(full_name_ar, full_name)"
    )
    .eq("organization_id", session!.activeOrgId!)
    .order("scheduled_date", { ascending: false })
    .limit(100);

  const today = new Date().toISOString().slice(0, 10);
  if (scope === "today") query = query.eq("scheduled_date", today);
  if (scope === "overdue") query = query.eq("status", "scheduled").lt("scheduled_date", today);
  if (scope === "completed_week") {
    query = query
      .gte("completed_at", daysAgoIso(7))
      .in("status", ["completed", "submitted", "under_review", "approved", "closed"]);
  }
  if (status) query = query.eq("status", status as InspectionStatus);

  const { data: inspections } = await query;

  const canSchedule = canAny(session!.permissions, [PERMISSIONS.INSPECTION_SCHEDULE, PERMISSIONS.INSPECTION_CREATE]);

  return (
    <div>
      <PageHeader
        title="التفتيشات"
        description="جدولة وتنفيذ ومراجعة عمليات التفتيش"
        actions={
          canSchedule ? (
            <Button asChild>
              <Link href="/inspections/new">
                <Plus className="h-4 w-4" /> جدولة تفتيش
              </Link>
            </Button>
          ) : undefined
        }
      />

      {!inspections || inspections.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="لا توجد عمليات تفتيش" description="لا توجد سجلات تطابق هذا الفلتر حاليًا." />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>القالب</TableHead>
                <TableHead>القسم</TableHead>
                <TableHead>المفتش</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>نسبة الالتزام</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inspections.map((i) => {
                const tpl = i.templates as unknown as { name_ar: string | null; name: string } | null;
                const dept = i.departments as unknown as { name_ar: string | null; name: string } | null;
                const inspector = i.profiles as unknown as { full_name_ar: string | null; full_name: string } | null;
                return (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">
                      <Link href={`/inspections/${i.id}`} className="hover:underline">
                        {tpl?.name_ar || tpl?.name || "—"}
                      </Link>
                    </TableCell>
                    <TableCell>{dept?.name_ar || dept?.name || "—"}</TableCell>
                    <TableCell>{inspector?.full_name_ar || inspector?.full_name || "غير مُعيّن"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(i.scheduled_date)}</TableCell>
                    <TableCell>
                      <StatusBadge status={i.status} label={inspectionStatusLabels[i.status].ar} />
                    </TableCell>
                    <TableCell className="tabular-nums">{formatPercent(i.compliance_percent)}</TableCell>
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
