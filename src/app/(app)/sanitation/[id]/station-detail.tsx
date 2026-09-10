"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { ArrowRight, Bug } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  sanitationStationTypeLabels,
  sanitationStationStatusLabels,
  pestActivityLevelLabels,
  sanitationConditionLabels,
  badgeToneForPestActivity,
  badgeToneForStatus,
} from "@/lib/labels";
import { formatDate, formatDateTime } from "@/lib/format";
import { updateStation, changeStationStatus, createCheck, type ActionResult } from "../actions";
import type { Database, SanitationStationStatus } from "@/types/database";

type Station = Database["public"]["Tables"]["sanitation_stations"]["Row"] & {
  site: { id: string; name: string; name_ar: string | null } | null;
  area: { id: string; name: string; name_ar: string | null } | null;
  department: { id: string; name: string; name_ar: string | null } | null;
};

type Check = Database["public"]["Tables"]["sanitation_checks"]["Row"] & {
  checker: { full_name: string; full_name_ar: string | null } | null;
};

interface Option {
  id: string;
  name: string;
  name_ar?: string | null;
}

const NEXT_STATUS: Partial<Record<SanitationStationStatus, SanitationStationStatus[]>> = {
  active: ["inactive", "removed"],
  inactive: ["active", "removed"],
  removed: [],
};

const checkInitialState: ActionResult = {};

export function StationDetail({
  station,
  departments,
  areas,
  checks,
  orgId,
  canManage,
  canExecute,
}: {
  station: Station;
  departments: Option[];
  areas: Option[];
  checks: Check[];
  orgId: string;
  canManage: boolean;
  canExecute: boolean;
}) {
  void orgId; // reserved for future evidence-upload wiring against sanitation_check_id
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [checkState, checkAction, checkPending] = useActionState(createCheck, checkInitialState);
  const [formKey, setFormKey] = useState(0);
  const qrValue = `${typeof window !== "undefined" ? window.location.origin : ""}/sanitation/${station.id}?qr=${station.qr_code_token}`;

  useEffect(() => {
    if (checkState?.ok) {
      toast.success("تم تسجيل الفحص");
      setFormKey((k) => k + 1);
      router.refresh();
    } else if (checkState?.error) {
      toast.error(checkState.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkState]);

  function runStatus(status: SanitationStationStatus) {
    startTransition(async () => {
      const res = await changeStationStatus(station.id, status);
      if (res.error) toast.error(res.error);
      else {
        toast.success("تم تحديث حالة المحطة");
        router.refresh();
      }
    });
  }

  function onSave(formData: FormData) {
    startTransition(async () => {
      const res = await updateStation(station.id, formData);
      if (res.error) toast.error(res.error);
      else toast.success("تم حفظ التعديلات");
    });
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link href="/sanitation" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="h-4 w-4" />
        العودة إلى سجل المحطات
      </Link>

      <PageHeader
        title={station.name_ar || station.name}
        description={`${station.station_code} · ${sanitationStationTypeLabels[station.station_type].ar}`}
        actions={<StatusBadge status={station.status} label={sanitationStationStatusLabels[station.status].ar} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {canExecute && (station.status === "active" || canManage) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bug className="h-4 w-4" />
                  تسجيل فحص جديد
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form key={formKey} action={checkAction} className="flex flex-col gap-4">
                  <input type="hidden" name="station_id" value={station.id} />
                  <input type="hidden" name="site_id" value={station.site_id} />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="activity_level">مستوى النشاط الحشري</Label>
                      <Select name="activity_level" defaultValue="none">
                        <SelectTrigger id="activity_level">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(pestActivityLevelLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label.ar}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="pest_type_observed">النوع الملاحظ (اختياري)</Label>
                      <Input id="pest_type_observed" name="pest_type_observed" placeholder="صراصير / قوارض / ذباب ..." />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="cleanliness_status">حالة النظافة (اختياري)</Label>
                      <Select name="cleanliness_status" defaultValue="">
                        <SelectTrigger id="cleanliness_status">
                          <SelectValue placeholder="غير مقيّمة" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(sanitationConditionLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label.ar}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="chemical_used">المادة المستخدمة (اختياري)</Label>
                      <Input id="chemical_used" name="chemical_used" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="corrective_action">الإجراء الفوري المتخذ (اختياري)</Label>
                    <Textarea id="corrective_action" name="corrective_action" rows={2} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="notes">ملاحظات</Label>
                    <Textarea id="notes" name="notes" rows={2} />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    سيتم إنشاء ملاحظة (عدم مطابقة) تلقائيًا إذا كان مستوى النشاط "مرتفع" أو كانت حالة النظافة "غير نظيف".
                  </p>

                  <div>
                    <Button type="submit" disabled={checkPending}>
                      {checkPending ? "جارٍ الحفظ..." : "حفظ الفحص"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">سجل الفحوصات</CardTitle>
            </CardHeader>
            <CardContent>
              {checks.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">لا توجد فحوصات مسجّلة لهذه المحطة بعد.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الرقم</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>النشاط</TableHead>
                        <TableHead>النظافة</TableHead>
                        <TableHead>بواسطة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {checks.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium" dir="ltr">
                            {c.check_number}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatDateTime(c.checked_at)}</TableCell>
                          <TableCell>
                            <Badge variant={badgeToneForPestActivity(c.activity_level)}>{pestActivityLevelLabels[c.activity_level].ar}</Badge>
                          </TableCell>
                          <TableCell>
                            {c.cleanliness_status ? (
                              <Badge variant={badgeToneForStatus(c.cleanliness_status)}>{sanitationConditionLabels[c.cleanliness_status].ar}</Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {c.checker?.full_name_ar || c.checker?.full_name || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">بيانات المحطة</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={onSave} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="name_ar">الاسم (بالعربية)</Label>
                    <Input id="name_ar" name="name_ar" defaultValue={station.name_ar ?? station.name} disabled={!canManage} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="name">الاسم بالإنجليزية</Label>
                    <Input id="name" name="name" dir="ltr" defaultValue={station.name} disabled={!canManage} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="department_id">القسم</Label>
                    <Select name="department_id" defaultValue={station.department_id ?? undefined} disabled={!canManage}>
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
                    <Select name="area_id" defaultValue={station.area_id ?? undefined} disabled={!canManage}>
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="target_pest">الآفة المستهدفة</Label>
                    <Input id="target_pest" name="target_pest" defaultValue={station.target_pest ?? ""} disabled={!canManage} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="installation_date">تاريخ التركيب</Label>
                    <Input
                      id="installation_date"
                      name="installation_date"
                      type="date"
                      defaultValue={station.installation_date ?? ""}
                      disabled={!canManage}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="notes">ملاحظات</Label>
                  <Textarea id="notes" name="notes" rows={3} defaultValue={station.notes ?? ""} disabled={!canManage} />
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
                {station.qr_code_token}
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
                <span>{station.site?.name_ar || station.site?.name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">المنطقة</span>
                <span>{station.area?.name_ar || station.area?.name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">القسم</span>
                <span>{station.department?.name_ar || station.department?.name || "—"}</span>
              </div>
            </CardContent>
          </Card>

          {canManage && (NEXT_STATUS[station.status]?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">تغيير الحالة</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {NEXT_STATUS[station.status]!.map((s) => (
                  <Button key={s} size="sm" variant="outline" disabled={isPending} onClick={() => runStatus(s)}>
                    {sanitationStationStatusLabels[s].ar}
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
                <span>أُنشئت في</span>
                <span>{formatDate(station.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span>آخر تحديث</span>
                <span>{formatDate(station.updated_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
