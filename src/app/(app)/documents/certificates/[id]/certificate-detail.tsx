"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EvidenceUploader } from "@/components/shared/evidence-uploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { certificateTypeLabels, certificateStatusLabels, certificateExpiryTone } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { updateCertificate, changeCertificateStatus } from "../../actions";
import type { Database, CertificateStatus } from "@/types/database";

type Certificate = Database["public"]["Tables"]["certificates"]["Row"] & {
  site: { id: string; name: string; name_ar: string | null } | null;
  responsible: { id: string; full_name: string; full_name_ar: string | null } | null;
};

const NEXT_STATUS: Partial<Record<CertificateStatus, CertificateStatus[]>> = {
  active: ["renewed", "cancelled"],
  renewed: [],
  cancelled: [],
};

export function CertificateDetail({ certificate, canManage }: { certificate: Certificate; canManage: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const tone = certificate.status === "active" ? certificateExpiryTone(certificate.expiry_date) : "neutral";

  function runStatus(status: CertificateStatus) {
    startTransition(async () => {
      const res = await changeCertificateStatus(certificate.id, status);
      if (res.error) toast.error(res.error);
      else {
        toast.success("تم تحديث الحالة");
        router.refresh();
      }
    });
  }

  function onSave(formData: FormData) {
    startTransition(async () => {
      const res = await updateCertificate(certificate.id, formData);
      if (res.error) toast.error(res.error);
      else toast.success("تم حفظ التعديلات");
    });
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link
        href="/documents/certificates"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="h-4 w-4" />
        العودة إلى الشهادات والتراخيص
      </Link>

      <PageHeader
        title={certificate.name_ar || certificate.name}
        description={`${certificate.certificate_number} · ${certificateTypeLabels[certificate.certificate_type].ar}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={tone}>انتهاء: {formatDate(certificate.expiry_date)}</Badge>
            <StatusBadge status={certificate.status} label={certificateStatusLabels[certificate.status].ar} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">بيانات الشهادة / الترخيص</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={onSave} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="name_ar">الاسم (بالعربية)</Label>
                    <Input id="name_ar" name="name_ar" defaultValue={certificate.name_ar ?? certificate.name} disabled={!canManage} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="name">الاسم بالإنجليزية</Label>
                    <Input id="name" name="name" dir="ltr" defaultValue={certificate.name} disabled={!canManage} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="issuing_authority">الجهة المُصدرة</Label>
                  <Input
                    id="issuing_authority"
                    name="issuing_authority"
                    defaultValue={certificate.issuing_authority ?? ""}
                    disabled={!canManage}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="external_reference">الرقم الرسمي للشهادة</Label>
                  <Input
                    id="external_reference"
                    name="external_reference"
                    dir="ltr"
                    defaultValue={certificate.external_reference ?? ""}
                    disabled={!canManage}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="issue_date">تاريخ الإصدار</Label>
                    <Input
                      id="issue_date"
                      name="issue_date"
                      type="date"
                      defaultValue={certificate.issue_date ?? ""}
                      disabled={!canManage}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="expiry_date">تاريخ الانتهاء</Label>
                    <Input
                      id="expiry_date"
                      name="expiry_date"
                      type="date"
                      defaultValue={certificate.expiry_date ?? ""}
                      disabled={!canManage}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="notes">ملاحظات</Label>
                  <Textarea id="notes" name="notes" rows={3} defaultValue={certificate.notes ?? ""} disabled={!canManage} />
                </div>

                {canManage && (
                  <div>
                    <Button type="submit" disabled={isPending}>
                      {isPending ? "جارٍ الحفظ..." : "حفظ التعديلات"}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">نسخة الشهادة</CardTitle>
            </CardHeader>
            <CardContent>
              <EvidenceUploader organizationId={certificate.organization_id} entityType="certificate" entityId={certificate.id} readOnly={!canManage} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">الموقع والمسؤول</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">الموقع</span>
                <span>{certificate.site?.name_ar || certificate.site?.name || "على مستوى المنظمة"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">المسؤول عن التجديد</span>
                <span>{certificate.responsible?.full_name_ar || certificate.responsible?.full_name || "—"}</span>
              </div>
            </CardContent>
          </Card>

          {canManage && (NEXT_STATUS[certificate.status]?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">تغيير الحالة</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {NEXT_STATUS[certificate.status]!.map((s) => (
                  <Button key={s} size="sm" variant="outline" disabled={isPending} onClick={() => runStatus(s)}>
                    {certificateStatusLabels[s].ar}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">تواريخ</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>أُنشئ في</span>
                <span>{formatDate(certificate.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span>آخر تحديث</span>
                <span>{formatDate(certificate.updated_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
