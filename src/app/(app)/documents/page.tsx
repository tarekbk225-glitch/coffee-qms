import Link from "next/link";
import { FileBadge, Plus, ShieldCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { can, PERMISSIONS } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { documentTypeLabels, documentStatusLabels } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import type { DocumentStatus, DocumentType } from "@/types/database";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; document_type?: string }>;
}) {
  const { status, document_type: documentType } = await searchParams;
  const session = await getSessionContext();
  const supabase = await createClient();

  let query = supabase
    .from("documents")
    .select("id, document_number, title, title_ar, document_type, version, status, review_date, department:departments(name, name_ar)")
    .eq("organization_id", session!.activeOrgId!)
    .order("document_number", { ascending: true })
    .order("version", { ascending: false })
    .limit(500);

  if (status) query = query.eq("status", status as DocumentStatus);
  if (documentType) query = query.eq("document_type", documentType as DocumentType);

  const { data } = await query;

  // Every version of a document shares its document_number; keep only the
  // latest (highest version) row per document family for the list view.
  const seen = new Set<string>();
  const documents = (data ?? []).filter((d) => {
    if (seen.has(d.document_number)) return false;
    seen.add(d.document_number);
    return true;
  });

  const canManage = can(session!.permissions, PERMISSIONS.DOCUMENT_MANAGE);
  const today = new Date();

  return (
    <div>
      <PageHeader
        title="إدارة المستندات"
        description="السياسات وإجراءات التشغيل القياسية والمواصفات، مع نسخ تاريخية محفوظة لكل مستند"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/documents/certificates">
                <ShieldCheck className="h-4 w-4" />
                الشهادات والتراخيص
              </Link>
            </Button>
            {canManage && (
              <Button asChild>
                <Link href="/documents/new">
                  <Plus className="h-4 w-4" />
                  مستند جديد
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {documents.length === 0 ? (
        <EmptyState
          icon={FileBadge}
          title="لا توجد مستندات مسجّلة"
          description="أضف أول سياسة أو إجراء تشغيل قياسي إلى نظام إدارة المستندات."
          action={
            canManage ? (
              <Button asChild size="sm">
                <Link href="/documents/new">إضافة مستند</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الرقم</TableHead>
                <TableHead>العنوان</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>القسم</TableHead>
                <TableHead>الإصدار</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>موعد المراجعة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((d) => {
                const department = d.department as unknown as { name: string; name_ar: string | null } | null;
                const reviewOverdue = d.status === "active" && d.review_date && new Date(d.review_date) <= today;
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium" dir="ltr">
                      <Link href={`/documents/${d.id}`} className="hover:underline">
                        {d.document_number}
                      </Link>
                    </TableCell>
                    <TableCell>{d.title_ar || d.title}</TableCell>
                    <TableCell className="text-muted-foreground">{documentTypeLabels[d.document_type].ar}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {department ? department.name_ar || department.name : "—"}
                    </TableCell>
                    <TableCell dir="ltr">v{d.version}</TableCell>
                    <TableCell>
                      <StatusBadge status={d.status} label={documentStatusLabels[d.status].ar} />
                    </TableCell>
                    <TableCell className={reviewOverdue ? "font-medium text-destructive" : "text-muted-foreground"}>
                      {formatDate(d.review_date)}
                      {reviewOverdue ? " · مستحقة" : ""}
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
