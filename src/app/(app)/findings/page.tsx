import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { findingSeverityLabels, findingStatusLabels } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import type { FindingStatus, FindingSeverity } from "@/types/database";

export default async function FindingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; severity?: string }>;
}) {
  const { status, severity } = await searchParams;
  const session = await getSessionContext();
  const supabase = await createClient();

  let query = supabase
    .from("findings")
    .select("id, finding_number, description, severity, status, detected_date, departments(name_ar, name)")
    .eq("organization_id", session!.activeOrgId!)
    .order("detected_date", { ascending: false })
    .limit(100);

  if (status) query = query.eq("status", status as FindingStatus);
  if (severity) query = query.eq("severity", severity as FindingSeverity);

  const { data: findings } = await query;

  return (
    <div>
      <PageHeader title="عدم المطابقات (الملاحظات)" description="تتبّع الملاحظات الناتجة عن التفتيش أو المرفوعة يدويًا حتى إغلاقها" />

      {!findings || findings.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="لا توجد ملاحظات" description="ستظهر هنا الملاحظات الناتجة تلقائيًا عن بنود التفتيش الفاشلة." />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الرقم</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead>القسم</TableHead>
                <TableHead>الخطورة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ الاكتشاف</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {findings.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium" dir="ltr">
                    <Link href={`/findings/${f.id}`} className="hover:underline">
                      {f.finding_number}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{f.description}</TableCell>
                  <TableCell>{(f.departments as unknown as { name_ar: string | null; name: string } | null)?.name_ar ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={f.severity === "critical" ? "destructive" : f.severity === "high" ? "warning" : "neutral"}>
                      {findingSeverityLabels[f.severity].ar}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={f.status} label={findingStatusLabels[f.status].ar} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(f.detected_date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
