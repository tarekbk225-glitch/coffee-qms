"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { ArrowRight, Wrench } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EvidenceUploader } from "@/components/shared/evidence-uploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assetStatusLabels, assetCriticalityLabels } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { updateAsset, changeAssetStatus } from "../actions";
import type { Database, AssetStatus } from "@/types/database";

type Asset = Database["public"]["Tables"]["assets"]["Row"] & {
  site: { id: string; name: string; name_ar: string | null } | null;
  area: { id: string; name: string; name_ar: string | null } | null;
  department: { id: string; name: string; name_ar: string | null } | null;
};

interface Option {
  id: string;
  name: string;
  name_ar?: string | null;
}

const NEXT_STATUS: Partial<Record<AssetStatus, AssetStatus[]>> = {
  active: ["under_maintenance", "inactive", "retired"],
  under_maintenance: ["active", "inactive"],
  inactive: ["active", "retired"],
  retired: [],
};

export function AssetDetail({
  asset,
  departments,
  areas,
  orgId,
  canEdit,
}: {
  asset: Asset;
  departments: Option[];
  areas: Option[];
  orgId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const qrValue = `${typeof window !== "undefined" ? window.location.origin : ""}/assets/${asset.id}?qr=${asset.qr_code_token}`;

  function runStatus(status: AssetStatus) {
    startTransition(async () => {
      const res = await changeAssetStatus(asset.id, status);
      if (res.error) toast.error(res.error);
      else {
        toast.success("تم تحديث حالة الأصل");
        router.refresh();
      }
    });
  }

  function onSave(formData: FormData) {
    startTransition(async () => {
      const res = await updateAsset(asset.id, formData);
      if (res.error) toast.error(res.error);
      else toast.success("تم حفظ التعديلات");
    });
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link href="/assets" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="h-4 w-4" />
        العودة إلى سجل الأصول
      </Link>

      <PageHeader
        title={asset.name_ar || asset.name}
        description={`${asset.asset_code} · ${asset.category}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={asset.criticality === "critical" ? "destructive" : asset.criticality === "high" ? "danger" : "neutral"}
            >
              {assetCriticalityLabels[asset.criticality].ar}
            </Badge>
            <StatusBadge status={asset.status} label={assetStatusLabels[asset.status].ar} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">بيانات الأصل</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={onSave} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="name_ar">الاسم (بالعربية)</Label>
                    <Input id="name_ar" name="name_ar" defaultValue={asset.name_ar ?? asset.name} disabled={!canEdit} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="name">الاسم بالإنجليزية</Label>
                    <Input id="name" name="name" dir="ltr" defaultValue={asset.name} disabled={!canEdit} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="category">الفئة</Label>
                    <Input id="category" name="category" defaultValue={asset.category} disabled={!canEdit} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="criticality">درجة الأهمية</Label>
                    <Select name="criticality" defaultValue={asset.criticality} disabled={!canEdit}>
                      <SelectTrigger id="criticality">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(assetCriticalityLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label.ar}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="department_id">القسم</Label>
                    <Select name="department_id" defaultValue={asset.department_id ?? undefined} disabled={!canEdit}>
                      <SelectTrigger id="department_id">
                        <SelectValue placeholder="بدون تحديد" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name_ar || d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="area_id">المنطقة</Label>
                    <Select name="area_id" defaultValue={asset.area_id ?? undefined} disabled={!canEdit}>
                      <SelectTrigger id="area_id">
                        <SelectValue placeholder="بدون تحديد" />
                      </SelectTrigger>
                      <SelectContent>
                        {areas.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name_ar || a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="manufacturer">الشركة المصنّعة</Label>
                    <Input id="manufacturer" name="manufacturer" defaultValue={asset.manufacturer ?? ""} disabled={!canEdit} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="model">الموديل</Label>
                    <Input id="model" name="model" dir="ltr" defaultValue={asset.model ?? ""} disabled={!canEdit} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="serial_number">الرقم التسلسلي</Label>
                    <Input id="serial_number" name="serial_number" dir="ltr" defaultValue={asset.serial_number ?? ""} disabled={!canEdit} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="installation_date">تاريخ التركيب</Label>
                    <Input
                      id="installation_date"
                      name="installation_date"
                      type="date"
                      defaultValue={asset.installation_date ?? ""}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="warranty_expiry">انتهاء الضمان</Label>
                    <Input
                      id="warranty_expiry"
                      name="warranty_expiry"
                      type="date"
                      defaultValue={asset.warranty_expiry ?? ""}
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="notes">ملاحظات</Label>
                  <Textarea id="notes" name="notes" rows={3} defaultValue={asset.notes ?? ""} disabled={!canEdit} />
                </div>

                {canEdit && (
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
              <CardTitle className="text-base">الملفات والمستندات</CardTitle>
            </CardHeader>
            <CardContent>
              <EvidenceUploader organizationId={orgId} entityType="asset" entityId={asset.id} readOnly={!canEdit} />
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="flex items-center gap-3 pt-6 text-sm text-muted-foreground">
              <Wrench className="h-5 w-5 shrink-0" />
              <p>
                طلبات الصيانة وسجل الأعطال وجدولة الصيانة الوقائية جزء من مرحلة قادمة من النظام، وسيتم ربطها مباشرة بهذا الأصل
                عبر رمز QR الخاص به.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">رمز QR</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <div className="rounded-lg border bg-white p-3">
                <QRCodeSVG value={qrValue} size={160} level="M" />
              </div>
              <p className="break-all text-center text-xs text-muted-foreground" dir="ltr">
                {asset.qr_code_token}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">الموقع</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">الموقع</span>
                <span>{asset.site?.name_ar || asset.site?.name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">المنطقة</span>
                <span>{asset.area?.name_ar || asset.area?.name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">القسم</span>
                <span>{asset.department?.name_ar || asset.department?.name || "—"}</span>
              </div>
            </CardContent>
          </Card>

          {canEdit && (NEXT_STATUS[asset.status]?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">تغيير الحالة</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {NEXT_STATUS[asset.status]!.map((s) => (
                  <Button key={s} size="sm" variant="outline" disabled={isPending} onClick={() => runStatus(s)}>
                    {assetStatusLabels[s].ar}
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
                <span>{formatDate(asset.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span>آخر تحديث</span>
                <span>{formatDate(asset.updated_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
