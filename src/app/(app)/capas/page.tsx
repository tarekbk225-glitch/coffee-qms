import Link from "next/link";
import { Wrench } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { capaStatusLabels, capaPriorityLabels } from "@/lib/labels";
import { formatDate } from "@/lib/format";

export default async function CapasPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const { scope } = await searchParams;
  const session = await getSessionContext();
  const supabase = await createClient();

  let query = supabase
    .from("capas")
    .select("id, capa_number, problem_description, status, priority, due_date, assignee:profiles!capas_assigned_to_fkey(full_name_ar, full_name)")
    .eq("organization_id", session!.activeOrgId!)
    .order("created_at", { ascending: false })
    .limit(100);

  const today = new Date().toISOString().slice(0, 10);
  if (scope === "open") query = query.not("status", "in", "(closed,rejected)");
  if (scope === "overdue") query = query.lt("due_date", today).not("status", "in", "(closed,rejected)");

  const { data: capas } = await query;

  return (
    <div>
      <PageHeader title="الإجراءات التصحيحية والوقائية" description="متابعة الإجراءات من الفتح حتى الإغلاق والتحقق" />

      {!capas || capas.length === 0 ? (
        <EmptyState icon={Wrench} title="لا توجد إجراءات" description="ستظهر هنا الإجراءات المُنشأة من الملاحظات أو المُضافة يدويًا." />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الرقم</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead>المسؤول</TableHead>
                <TableHead>الأولوية</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ الاستحقاق</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {capas.map((c) => {
                const overdue = c.due_date && c.due_date < today && !["closed", "rejected"].includes(c.status);
                const assignee = c.assignee as unknown as { full_name_ar: string | null; full_name: string } | null;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium" dir="ltr">
                      <Link href={`/capas/${c.id}`} className="hover:underline">
                        {c.capa_number}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{c.problem_description}</TableCell>
                    <TableCell>{assignee?.full_name_ar || assignee?.full_name || "غير مُسند"}</TableCell>
                    <TableCell>
                      <Badge variant={c.priority === "urgent" ? "destructive" : c.priority === "high" ? "warning" : "neutral"}>
                        {capaPriorityLabels[c.priority].ar}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} label={capaStatusLabels[c.status].ar} />
                    </TableCell>
                    <TableCell className={overdue ? "font-medium text-destructive" : "text-muted-foreground"}>{formatDate(c.due_date)}</TableCell>
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
