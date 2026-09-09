"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EvidenceUploader } from "@/components/shared/evidence-uploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { findingSeverityLabels, findingStatusLabels, capaStatusLabels } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { changeFindingStatus, assignFinding, updateFindingFields, createCapaFromFinding, type ActionResult } from "../actions";
import type { Database, FindingStatus } from "@/types/database";

type Finding = Database["public"]["Tables"]["findings"]["Row"] & {
  departments: { name_ar: string | null; name: string } | null;
  sites: { name_ar: string | null; name: string } | null;
  assignee: { id: string; full_name: string; full_name_ar: string | null } | null;
};
type CapaRow = { id: string; capa_number: string; status: string; required_action: string; priority: string; due_date: string | null; assigned_to: string | null };

const NEXT: Record<FindingStatus, { status: FindingStatus; label: string; variant?: "outline" }[]> = {
  open: [{ status: "assigned", label: "إسناد" }, { status: "rejected", label: "رفض", variant: "outline" }],
  assigned: [{ status: "investigation", label: "بدء التحقيق" }, { status: "action_required", label: "يتطلب إجراء" }],
  investigation: [{ status: "action_required", label: "يتطلب إجراء" }],
  action_required: [{ status: "verification", label: "إرسال للتحقق" }],
  verification: [{ status: "closed", label: "إغلاق" }, { status: "action_required", label: "إعادة فتح", variant: "outline" }],
  closed: [],
  rejected: [],
};

const initialCapaState: ActionResult = {};

export function FindingDetail({
  finding,
  capas,
  members,
  orgId,
  canManage,
  canClose,
  canCreateCapa,
  currentUserId,
}: {
  finding: Finding;
  capas: CapaRow[];
  members: { id: string; name: string }[];
  orgId: string;
  canManage: boolean;
  canClose: boolean;
  canCreateCapa: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [capaDialogOpen, setCapaDialogOpen] = useState(false);
  const isAssignee = finding.assigned_to === currentUserId;
  const canTransition = canManage || canClose || isAssignee;

  const [capaState, capaAction, capaPending] = useActionState(async (_prev: ActionResult, fd: FormData) => {
    const res = await createCapaFromFinding(_prev, fd);
    if (res.ok) {
      toast.success("تم إنشاء الإجراء التصحيحي");
      setCapaDialogOpen(false);
      router.refresh();
    }
    return res;
  }, initialCapaState);

  function transition(status: FindingStatus) {
    startTransition(async () => {
      const res = await changeFindingStatus(finding.id, status);
      if (res.error) toast.error(res.error);
      else {
        toast.success("تم تحديث الحالة");
        router.refresh();
      }
    });
  }

  function saveFields(formData: FormData) {
    startTransition(async () => {
      const res = await updateFindingFields(finding.id, formData);
      if (res.error) toast.error(res.error);
      else toast.success("تم الحفظ");
    });
  }

  function assign(userId: string) {
    startTransition(async () => {
      const res = await assignFinding(finding.id, userId || null);
      if (res.error) toast.error(res.error);
      else {
        toast.success("تم الإسناد");
        router.refresh();
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={finding.finding_number}
        description={finding.description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={finding.severity === "critical" ? "destructive" : finding.severity === "high" ? "warning" : "neutral"}>
              {findingSeverityLabels[finding.severity].ar}
            </Badge>
            <StatusBadge status={finding.status} label={findingStatusLabels[finding.status].ar} />
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {canTransition &&
          NEXT[finding.status].map((n) => (
            <Button key={n.status} size="sm" variant={n.variant ?? "default"} disabled={isPending} onClick={() => transition(n.status)}>
              {n.label}
            </Button>
          ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">تفاصيل الملاحظة</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={saveFields} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                  <p>
                    الموقع: <span className="text-foreground">{finding.sites?.name_ar || "—"}</span>
                  </p>
                  <p>
                    القسم: <span className="text-foreground">{finding.departments?.name_ar || "—"}</span>
                  </p>
                  <p>
                    تاريخ الاكتشاف: <span className="text-foreground">{formatDate(finding.detected_date)}</span>
                  </p>
                  <p>
                    المصدر: <span className="text-foreground">{finding.source === "inspection" ? "تفتيش" : "يدوي"}</span>
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="category">الفئة</Label>
                  <Input id="category" name="category" defaultValue={finding.category ?? ""} disabled={!canManage} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="immediate_action">الإجراء الفوري المُتخذ</Label>
                  <Textarea id="immediate_action" name="immediate_action" rows={2} defaultValue={finding.immediate_action ?? ""} disabled={!canManage} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="root_cause">السبب الجذري (إن عُرف)</Label>
                  <Textarea id="root_cause" name="root_cause" rows={2} defaultValue={finding.root_cause ?? ""} disabled={!canManage} />
                </div>
                {canManage && (
                  <Button type="submit" size="sm" className="self-start" disabled={isPending}>
                    حفظ
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">الأدلة</CardTitle>
            </CardHeader>
            <CardContent>
              <EvidenceUploader organizationId={orgId} entityType="finding" entityId={finding.id} readOnly={!canManage && !isAssignee} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">الإسناد</CardTitle>
            </CardHeader>
            <CardContent>
              {canManage ? (
                <Select defaultValue={finding.assigned_to ?? ""} onValueChange={assign}>
                  <SelectTrigger>
                    <SelectValue placeholder="غير مُسند" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm">{finding.assignee?.full_name_ar || finding.assignee?.full_name || "غير مُسند"}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">الإجراءات التصحيحية</CardTitle>
              {canCreateCapa && finding.status !== "closed" && finding.status !== "rejected" && (
                <Dialog open={capaDialogOpen} onOpenChange={setCapaDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="h-3.5 w-3.5" /> إنشاء إجراء
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>إنشاء إجراء تصحيحي/وقائي</DialogTitle>
                    </DialogHeader>
                    <form action={capaAction} className="flex flex-col gap-4">
                      <input type="hidden" name="finding_id" value={finding.id} />
                      <input type="hidden" name="site_id" value={finding.site_id} />
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="problem_description">وصف المشكلة</Label>
                        <Textarea id="problem_description" name="problem_description" rows={2} defaultValue={finding.description} required />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="required_action">الإجراء المطلوب</Label>
                        <Textarea id="required_action" name="required_action" rows={2} required />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="action_type">النوع</Label>
                          <Select name="action_type" defaultValue="corrective">
                            <SelectTrigger id="action_type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="corrective">تصحيحي</SelectItem>
                              <SelectItem value="preventive">وقائي</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="priority">الأولوية</Label>
                          <Select name="priority" defaultValue="medium">
                            <SelectTrigger id="priority">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">منخفضة</SelectItem>
                              <SelectItem value="medium">متوسطة</SelectItem>
                              <SelectItem value="high">عالية</SelectItem>
                              <SelectItem value="urgent">عاجلة</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="assigned_to">إسناد إلى</Label>
                          <Select name="assigned_to">
                            <SelectTrigger id="assigned_to">
                              <SelectValue placeholder="لاحقًا" />
                            </SelectTrigger>
                            <SelectContent>
                              {members.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="due_date">تاريخ الاستحقاق</Label>
                          <Input id="due_date" name="due_date" type="date" />
                        </div>
                      </div>
                      {capaState?.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{capaState.error}</p>}
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button type="button" variant="outline">
                            إلغاء
                          </Button>
                        </DialogClose>
                        <Button type="submit" disabled={capaPending}>
                          إنشاء
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {capas.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا يوجد إجراء مرتبط بعد</p>
              ) : (
                capas.map((c) => (
                  <Link key={c.id} href={`/capas/${c.id}`} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 hover:bg-muted/50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium" dir="ltr">
                        {c.capa_number}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{c.required_action}</p>
                    </div>
                    <StatusBadge status={c.status} label={capaStatusLabels[c.status as keyof typeof capaStatusLabels].ar} />
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
