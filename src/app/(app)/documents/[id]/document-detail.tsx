"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, GitBranch } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EvidenceUploader } from "@/components/shared/evidence-uploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { documentStatusLabels, documentTypeLabels } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { updateDocument, changeDocumentStatus, createDocumentRevision } from "../actions";
import type { Database, DocumentStatus } from "@/types/database";

type Document = Database["public"]["Tables"]["documents"]["Row"] & {
  department: { id: string; name: string; name_ar: string | null } | null;
  owner: { id: string; full_name: string; full_name_ar: string | null } | null;
  approver: { id: string; full_name: string; full_name_ar: string | null } | null;
};

interface VersionRow {
  id: string;
  version: number;
  status: DocumentStatus;
  created_at: string;
  approved_at: string | null;
}

interface Option {
  id: string;
  name: string;
  name_ar?: string | null;
}

const NEXT_STATUS: Partial<Record<DocumentStatus, DocumentStatus[]>> = {
  draft: ["review"],
  review: ["approved", "draft"],
  approved: ["active", "draft"],
  active: ["obsolete"],
  obsolete: [],
};

export function DocumentDetail({
  document,
  departments,
  versions,
  orgId,
  canManage,
}: {
  document: Document;
  departments: Option[];
  versions: VersionRow[];
  orgId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isLatestVersion = versions[0]?.id === document.id;
  const hasNewerDraft = versions.some((v) => v.version > document.version && v.status !== "obsolete");

  function runStatus(status: DocumentStatus) {
    startTransition(async () => {
      const res = await changeDocumentStatus(document.id, status);
      if (res.error) toast.error(res.error);
      else {
        toast.success("تم تحديث حالة المستند");
        router.refresh();
      }
    });
  }

  function onSave(formData: FormData) {
    startTransition(async () => {
      const res = await updateDocument(document.id, formData);
      if (res.error) toast.error(res.error);
      else toast.success("تم حفظ التعديلات");
    });
  }

  function onNewRevision() {
    startTransition(async () => {
      const res = await createDocumentRevision(document.id);
      if (res.error) toast.error(res.error);
      else if (res.newId) {
        toast.success("تم إنشاء نسخة جديدة كمسودة");
        router.push(`/documents/${res.newId}`);
      }
    });
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link href="/documents" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="h-4 w-4" />
        العودة إلى المستندات
      </Link>

      <PageHeader
        title={document.title_ar || document.title}
        description={`${document.document_number} · الإصدار ${document.version} · ${documentTypeLabels[document.document_type].ar}`}
        actions={<StatusBadge status={document.status} label={documentStatusLabels[document.status].ar} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">بيانات المستند</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={onSave} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="title_ar">العنوان (بالعربية)</Label>
                    <Input id="title_ar" name="title_ar" defaultValue={document.title_ar ?? document.title} disabled={!canManage} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="title">العنوان بالإنجليزية</Label>
                    <Input id="title" name="title" dir="ltr" defaultValue={document.title} disabled={!canManage} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="department_id">القسم</Label>
                  <Select name="department_id" defaultValue={document.department_id ?? undefined} disabled={!canManage}>
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
                  <Label htmlFor="review_date">موعد المراجعة القادم</Label>
                  <Input
                    id="review_date"
                    name="review_date"
                    type="date"
                    defaultValue={document.review_date ?? ""}
                    disabled={!canManage}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="notes">ملاحظات</Label>
                  <Textarea id="notes" name="notes" rows={3} defaultValue={document.notes ?? ""} disabled={!canManage} />
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
              <CardTitle className="text-base">الملف المرفق</CardTitle>
            </CardHeader>
            <CardContent>
              <EvidenceUploader organizationId={orgId} entityType="document" entityId={document.id} readOnly={!canManage} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">سجل الإصدارات</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2 text-sm">
                {versions.map((v) => (
                  <li key={v.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    {v.id === document.id ? (
                      <span className="font-medium">الإصدار {v.version} (هذه الصفحة)</span>
                    ) : (
                      <Link href={`/documents/${v.id}`} className="hover:underline">
                        الإصدار {v.version}
                      </Link>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <StatusBadge status={v.status} label={documentStatusLabels[v.status].ar} />
                      <span dir="ltr">{formatDate(v.created_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          {canManage && (NEXT_STATUS[document.status]?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">تغيير الحالة</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {NEXT_STATUS[document.status]!.map((s) => (
                  <Button key={s} size="sm" variant="outline" disabled={isPending} onClick={() => runStatus(s)}>
                    {documentStatusLabels[s].ar}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {canManage && document.status === "active" && isLatestVersion && !hasNewerDraft && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">مراجعة جديدة</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <GitBranch className="h-4 w-4 shrink-0" />
                  ينشئ نسخة مسودة جديدة بنفس رقم المستند لتعديلها دون المساس بالنسخة السارية حاليًا.
                </p>
                <Button size="sm" variant="outline" disabled={isPending} onClick={onNewRevision}>
                  إنشاء نسخة جديدة
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">الملكية</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المالك</span>
                <span>{document.owner?.full_name_ar || document.owner?.full_name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">اعتمده</span>
                <span>{document.approver?.full_name_ar || document.approver?.full_name || "—"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">تواريخ</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>تاريخ السريان</span>
                <span>{formatDate(document.effective_date)}</span>
              </div>
              <div className="flex justify-between">
                <span>موعد المراجعة</span>
                <span>{formatDate(document.review_date)}</span>
              </div>
              <div className="flex justify-between">
                <span>أُنشئ في</span>
                <span>{formatDate(document.created_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
