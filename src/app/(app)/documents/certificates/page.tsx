import Link from "next/link";
import { ShieldCheck, Plus, ArrowRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { can, PERMISSIONS } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { certificateTypeLabels, certificateStatusLabels, certificateExpiryTone } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import type { CertificateStatus, CertificateType } from "@/types/database";

export default async function CertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; certificate_type?: string }>;
}) {
  const { status, certificate_type: certificateType } = await searchParams;
  const session = await getSessionContext();
  const supabase = await createClient();

  let query = supabase
    .from("certificates")
    .select("id, certificate_number, name, name_ar, certificate_type, issuing_authority, expiry_date, status, site:sites(name, name_ar)")
    .eq("organization_id", session!.activeOrgId!)
    .order("expiry_date", { ascending: true, nullsFirst: false })
    .limit(300);

  if (status) query = query.eq("status", status as CertificateStatus);
  if (certificateType) query = query.eq("certificate_type", certificateType as CertificateType);

  const { data: certificates } = await query;
  const canManage = can(session!.permissions, PERMISSIONS.DOCUMENT_MANAGE);

  return (
    <div>
      <Link
        href="/documents"
        className="mb-2 inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="h-4 w-4" />
        العودة إلى المستندات
      </Link>

      <PageHeader
        title="الشهادات والتراخيص الرسمية"
        description="شهادة الصلاحية البلدية وكل ترخيص أو شهادة رسمية أخرى، مع تنبيه قبل انتهاء الصلاحية"
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/documents/certificates/new">
                <Plus className="h-4 w-4" />
                شهادة / ترخيص جديد
              </Link>
            </Button>
          ) : undefined
        }
      />

      {!certificates || certificates.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="لا توجد شهادات أو تراخيص مسجّلة"
          description="أضف أول شهادة أو ترخيص رسمي لمتابعة تاريخ انتهائه تلقائيًا."
          action={
            canManage ? (
              <Button asChild size="sm">
                <Link href="/documents/certificates/new">إضافة شهادة</Link>
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
                <TableHead>الاسم</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الموقع</TableHead>
                <TableHead>الجهة المُصدرة</TableHead>
                <TableHead>تاريخ الانتهاء</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {certificates.map((c) => {
                const site = c.site as unknown as { name: string; name_ar: string | null } | null;
                const tone = c.status === "active" ? certificateExpiryTone(c.expiry_date) : "neutral";
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium" dir="ltr">
                      <Link href={`/documents/certificates/${c.id}`} className="hover:underline">
                        {c.certificate_number}
                      </Link>
                    </TableCell>
                    <TableCell>{c.name_ar || c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{certificateTypeLabels[c.certificate_type].ar}</TableCell>
                    <TableCell className="text-muted-foreground">{site ? site.name_ar || site.name : "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.issuing_authority || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={tone}>{formatDate(c.expiry_date)}</Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} label={certificateStatusLabels[c.status].ar} />
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
