"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

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
import { capaStatusLabels, capaPriorityLabels } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import {
  changeCapaStatus,
  updateCapaFields,
  saveFiveWhys,
  addFishboneCause,
  deleteFishboneCause,
  submitCapa,
  rejectCapa,
  approveCapa,
} from "../actions";
import type { Database, FishboneCategory } from "@/types/database";

type Capa = Database["public"]["Tables"]["capas"]["Row"] & {
  findings: { id: string; finding_number: string; description: string } | null;
  assignee: { id: string; full_name: string; full_name_ar: string | null } | null;
};
type FiveWhys = Database["public"]["Tables"]["capa_five_whys"]["Row"] | null;
type Fishbone = Database["public"]["Tables"]["capa_fishbone_causes"]["Row"];

const FISHBONE_LABELS: Record<FishboneCategory, string> = {
  man: "العنصر البشري",
  machine: "الآلات",
  method: "الطريقة",
  material: "المواد",
  measurement: "القياس",
  environment: "البيئة",
};

export function CapaDetail({
  capa,
  fiveWhys,
  fishbone,
  members,
  orgId,
  currentUserId,
  canAssign,
  canVerify,
  canApprove,
  canClose,
}: {
  capa: Capa;
  fiveWhys: FiveWhys;
  fishbone: Fishbone[];
  members: { id: string; name: string }[];
  orgId: string;
  currentUserId: string;
  canAssign: boolean;
  canVerify: boolean;
  canApprove: boolean;
  canClose: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isAssignee = capa.assigned_to === currentUserId;
  const [submitOpen, setSubmitOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [completionNotes, setCompletionNotes] = useState(capa.completion_notes ?? "");
  const [rejectReason, setRejectReason] = useState("");
  const [newCause, setNewCause] = useState("");
  const [newCategory, setNewCategory] = useState<FishboneCategory>("method");

  function run(fn: () => Promise<{ error?: string }>, successMsg = "تم الحفظ") {
    startTransition(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else {
        toast.success(successMsg);
        router.refresh();
      }
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const overdue = capa.due_date && capa.due_date < today && !["closed", "rejected"].includes(capa.status);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={capa.capa_number}
        description={capa.problem_description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={capa.priority === "urgent" ? "destructive" : capa.priority === "high" ? "warning" : "neutral"}>
              {capaPriorityLabels[capa.priority].ar}
            </Badge>
            <StatusBadge status={capa.status} label={capaStatusLabels[capa.status].ar} />
          </div>
        }
      />

      {capa.findings && (
        <Link href={`/findings/${capa.findings.id}`} className="mb-4 block rounded-lg border bg-muted/30 px-3 py-2 text-sm hover:bg-muted/50">
          مرتبط بالملاحظة <span className="font-medium" dir="ltr">{capa.findings.finding_number}</span> — {capa.findings.description}
        </Link>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {capa.status === "open" && canAssign && (
          <Button size="sm" disabled={isPending} onClick={() => run(() => changeCapaStatus(capa.id, "assigned"))}>
            إسناد
          </Button>
        )}
        {capa.status === "assigned" && (isAssignee || canAssign) && (
          <Button size="sm" disabled={isPending} onClick={() => run(() => changeCapaStatus(capa.id, "in_progress"))}>
            بدء التنفيذ
          </Button>
        )}
        {capa.status === "in_progress" && (isAssignee || canAssign) && (
          <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
            <DialogTrigger asChild>
              <Button size="sm">إرسال للتحقق</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إرسال الإجراء للتحقق</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <Label htmlFor="completion_notes">ملاحظات الإنجاز</Label>
                <Textarea id="completion_notes" rows={4} value={completionNotes} onChange={(e) => setCompletionNotes(e.target.value)} placeholder="ما الذي تم تنفيذه لمعالجة المشكلة؟" />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">إلغاء</Button>
                </DialogClose>
                <Button
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await submitCapa(capa.id, completionNotes);
                      if (res.error) toast.error(res.error);
                      else {
                        toast.success("تم الإرسال للتحقق");
                        setSubmitOpen(false);
                        router.refresh();
                      }
                    })
                  }
                >
                  إرسال
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {capa.status === "submitted" && canVerify && (
          <Button size="sm" disabled={isPending} onClick={() => run(() => changeCapaStatus(capa.id, "verification"))}>
            بدء التحقق
          </Button>
        )}
        {capa.status === "verification" && canApprove && (
          <Button size="sm" disabled={isPending} onClick={() => run(() => approveCapa(capa.id, ""))}>
            اعتماد
          </Button>
        )}
        {capa.status === "verification" && (canVerify || canApprove) && (
          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-destructive">
                رفض
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>رفض الإجراء</DialogTitle>
              </DialogHeader>
              <Textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="سبب الرفض" />
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">إلغاء</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await rejectCapa(capa.id, rejectReason);
                      if (res.error) toast.error(res.error);
                      else {
                        toast.success("تم الرفض");
                        setRejectOpen(false);
                        router.refresh();
                      }
                    })
                  }
                >
                  تأكيد الرفض
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {capa.status === "rejected" && (isAssignee || canAssign) && (
          <Button size="sm" disabled={isPending} onClick={() => run(() => changeCapaStatus(capa.id, "in_progress"))}>
            إعادة العمل عليه
          </Button>
        )}
        {capa.status === "approved" && canClose && (
          <Button size="sm" disabled={isPending} onClick={() => run(() => changeCapaStatus(capa.id, "closed"))}>
            إغلاق
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">التفاصيل</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                action={(fd) => run(() => updateCapaFields(capa.id, fd))}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="root_cause">السبب الجذري</Label>
                  <Textarea id="root_cause" name="root_cause" rows={2} defaultValue={capa.root_cause ?? ""} disabled={!isAssignee && !canAssign} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="due_date">تاريخ الاستحقاق</Label>
                    <Input id="due_date" name="due_date" type="date" defaultValue={capa.due_date ?? ""} disabled={!canAssign} className={overdue ? "border-destructive text-destructive" : ""} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="priority">الأولوية</Label>
                    <Select name="priority" defaultValue={capa.priority} disabled={!canAssign}>
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
                {canAssign && (
                  <Button type="submit" size="sm" className="self-start" disabled={isPending}>
                    حفظ
                  </Button>
                )}
              </form>
              {capa.completion_notes && (
                <div className="mt-3 rounded-lg bg-muted/40 p-3 text-sm">
                  <p className="mb-1 font-medium">ملاحظات الإنجاز</p>
                  <p className="text-muted-foreground">{capa.completion_notes}</p>
                </div>
              )}
              {capa.rejected_reason && (
                <div className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <p className="mb-1 font-medium">سبب الرفض</p>
                  <p>{capa.rejected_reason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">تحليل الأسباب الجذرية — الأسئلة الخمسة (5 Whys)</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={(fd) => run(() => saveFiveWhys(capa.id, fd))} className="flex flex-col gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="flex flex-col gap-1">
                    <Label htmlFor={`why_${n}`} className="text-xs text-muted-foreground">
                      لماذا #{n}
                    </Label>
                    <Input id={`why_${n}`} name={`why_${n}`} defaultValue={(fiveWhys?.[`why_${n}` as keyof typeof fiveWhys] as string) ?? ""} />
                  </div>
                ))}
                <div className="mt-2 flex flex-col gap-1">
                  <Label htmlFor="final_root_cause">السبب الجذري النهائي</Label>
                  <Textarea id="final_root_cause" name="final_root_cause" rows={2} defaultValue={fiveWhys?.final_root_cause ?? ""} />
                </div>
                <Button type="submit" size="sm" className="mt-2 self-start" disabled={isPending}>
                  حفظ التحليل
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">مخطط عظم السمكة (Fishbone)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {fishbone.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {fishbone.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                      <span>
                        <Badge variant="neutral" className="me-2">
                          {FISHBONE_LABELS[f.category]}
                        </Badge>
                        {f.cause_text}
                      </span>
                      <button onClick={() => run(() => deleteFishboneCause(capa.id, f.id))} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select value={newCategory} onValueChange={(v) => setNewCategory(v as FishboneCategory)}>
                  <SelectTrigger className="sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FISHBONE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input value={newCause} onChange={(e) => setNewCause(e.target.value)} placeholder="السبب المحتمل" className="flex-1" />
                <Button
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      const res = await addFishboneCause(capa.id, newCategory, newCause);
                      if (res.error) toast.error(res.error);
                      else {
                        setNewCause("");
                        router.refresh();
                      }
                    })
                  }
                >
                  إضافة
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">الأدلة</CardTitle>
            </CardHeader>
            <CardContent>
              <EvidenceUploader organizationId={orgId} entityType="capa" entityId={capa.id} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">الإسناد</CardTitle>
            </CardHeader>
            <CardContent>
              {canAssign ? (
                <Select
                  defaultValue={capa.assigned_to ?? ""}
                  onValueChange={(v) => {
                    const fd = new FormData();
                    fd.set("assigned_to", v);
                    fd.set("due_date", capa.due_date ?? "");
                    run(() => updateCapaFields(capa.id, fd));
                  }}
                >
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
                <p className="text-sm">{capa.assignee?.full_name_ar || capa.assignee?.full_name || "غير مُسند"}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                تاريخ الاستحقاق: <span className={overdue ? "font-medium text-destructive" : ""}>{formatDate(capa.due_date)}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
