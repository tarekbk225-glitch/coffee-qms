"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Lock, ArrowUp, ArrowDown, ShieldAlert, GitBranch } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { QuestionFormFields } from "./question-form-fields";
import { templateStatusLabels, questionTypeLabels } from "@/lib/labels";
import type { Database, TemplateStatus } from "@/types/database";
import {
  addQuestion,
  addSection,
  changeTemplateStatus,
  createRevision,
  deleteQuestion,
  deleteSection,
  deleteTemplate,
  swapSectionOrder,
  updateQuestion,
} from "../actions";

type Template = Database["public"]["Tables"]["templates"]["Row"];
type Section = Database["public"]["Tables"]["template_sections"]["Row"];
type Question = Database["public"]["Tables"]["template_questions"]["Row"];

const NEXT_STATUS: Partial<Record<TemplateStatus, { status: TemplateStatus; label: string; variant?: "outline" | "default" }[]>> = {
  draft: [{ status: "under_review", label: "إرسال للمراجعة" }],
  under_review: [
    { status: "approved", label: "اعتماد" },
    { status: "draft", label: "إعادة لمسودة", variant: "outline" },
  ],
  approved: [
    { status: "published", label: "نشر القالب" },
    { status: "draft", label: "إعادة للتعديل", variant: "outline" },
  ],
  published: [{ status: "archived", label: "أرشفة", variant: "outline" }],
};

export function TemplateBuilder({
  template,
  sections,
  questions,
  orgId,
  canEdit,
  canReview,
  canPublish,
}: {
  template: Template;
  sections: Section[];
  questions: Question[];
  orgId: string;
  canEdit: boolean;
  canReview: boolean;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addingSection, setAddingSection] = useState(false);
  const [questionDialog, setQuestionDialog] = useState<{ sectionId: string; question?: Question } | null>(null);

  const structureLocked = !["draft", "under_review"].includes(template.status);
  const canEditStructure = canEdit && !structureLocked;

  function run(fn: () => Promise<{ error?: string; ok?: boolean }>) {
    startTransition(async () => {
      const res = await fn();
      if (res?.error) toast.error(res.error);
      else {
        toast.success("تم الحفظ");
        router.refresh();
      }
    });
  }

  const nextActions = (NEXT_STATUS[template.status] ?? []).filter((a) => {
    if (["approved", "draft"].includes(a.status) && template.status === "under_review") return canReview;
    if (a.status === "published" || a.status === "archived") return canPublish;
    if (a.status === "under_review") return canEdit || canReview;
    if (a.status === "draft" && template.status === "approved") return canEdit || canReview;
    return canEdit;
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={template.name_ar || template.name}
        description={`${template.code} · الإصدار ${template.version} · ${template.category}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={template.status} label={templateStatusLabels[template.status].ar} />
            {nextActions.map((a) => (
              <Button
                key={a.status}
                size="sm"
                variant={a.variant ?? "default"}
                disabled={isPending}
                onClick={() => run(() => changeTemplateStatus(template.id, a.status))}
              >
                {a.label}
              </Button>
            ))}
            {template.status === "published" && canEdit && (
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(() => createRevision(template.id))}>
                <GitBranch className="h-3.5 w-3.5" /> نسخة جديدة للتعديل
              </Button>
            )}
            {template.status === "draft" && canEdit && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={isPending}
                onClick={() => {
                  if (confirm("هل تريد حذف هذا القالب نهائيًا؟")) {
                    startTransition(async () => {
                      await deleteTemplate(template.id);
                      router.push("/templates");
                    });
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> حذف
              </Button>
            )}
          </div>
        }
      />

      {structureLocked && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <Lock className="h-4 w-4 shrink-0" />
          هذا القالب لم يعد قابلاً للتعديل في حالته الحالية. لإجراء تغييرات، أنشئ نسخة جديدة منه.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {sections.map((section, idx) => (
          <Card key={section.id}>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">{section.title_ar || section.title}</CardTitle>
              {canEditStructure && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={idx === 0}
                    onClick={() =>
                      run(() =>
                        swapSectionOrder(
                          template.id,
                          { id: section.id, sortOrder: section.sort_order },
                          { id: sections[idx - 1].id, sortOrder: sections[idx - 1].sort_order }
                        )
                      )
                    }
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={idx === sections.length - 1}
                    onClick={() =>
                      run(() =>
                        swapSectionOrder(
                          template.id,
                          { id: section.id, sortOrder: section.sort_order },
                          { id: sections[idx + 1].id, sortOrder: sections[idx + 1].sort_order }
                        )
                      )
                    }
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm("حذف هذا القسم وجميع أسئلته؟")) run(() => deleteSection(template.id, section.id));
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {questions
                .filter((q) => q.section_id === section.id)
                .map((q) => (
                  <div key={q.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium">{q.prompt_ar || q.prompt}</p>
                        {q.is_critical && (
                          <Badge variant="destructive" className="gap-1">
                            <ShieldAlert className="h-3 w-3" /> حرج
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {questionTypeLabels[q.type].ar}
                        {q.is_required ? " · إلزامي" : ""}
                        {q.min_value !== null || q.max_value !== null ? ` · المدى: ${q.min_value ?? "—"} إلى ${q.max_value ?? "—"} ${q.unit ?? ""}` : ""}
                      </p>
                    </div>
                    {canEditStructure && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setQuestionDialog({ sectionId: section.id, question: q })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("حذف هذا السؤال؟")) run(() => deleteQuestion(template.id, q.id));
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

              {questions.filter((q) => q.section_id === section.id).length === 0 && (
                <p className="py-3 text-center text-sm text-muted-foreground">لا توجد أسئلة في هذا القسم بعد</p>
              )}

              {canEditStructure && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 self-start"
                  onClick={() => setQuestionDialog({ sectionId: section.id })}
                >
                  <Plus className="h-3.5 w-3.5" /> إضافة سؤال
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        {sections.length === 0 && (
          <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
            لا توجد أقسام بعد. أضف أول قسم للبدء بإضافة الأسئلة.
          </p>
        )}

        {canEditStructure && (
          <Card>
            <CardContent className="pt-6">
              {addingSection ? (
                <form
                  action={(fd) => {
                    run(() => addSection(template.id, orgId, sections.length, fd));
                    setAddingSection(false);
                  }}
                  className="flex flex-col gap-3 sm:flex-row sm:items-end"
                >
                  <div className="flex-1">
                    <Label htmlFor="title_ar" className="mb-1.5 block">
                      عنوان القسم
                    </Label>
                    <Input id="title_ar" name="title_ar" placeholder="مثال: النظافة الشخصية" autoFocus required />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">إضافة</Button>
                    <Button type="button" variant="ghost" onClick={() => setAddingSection(false)}>
                      إلغاء
                    </Button>
                  </div>
                </form>
              ) : (
                <Button variant="outline" onClick={() => setAddingSection(true)}>
                  <Plus className="h-4 w-4" /> إضافة قسم
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!questionDialog} onOpenChange={(o) => !o && setQuestionDialog(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{questionDialog?.question ? "تعديل السؤال" : "سؤال جديد"}</DialogTitle>
          </DialogHeader>
          {questionDialog && (
            <form
              action={(fd) => {
                const promise = questionDialog.question
                  ? updateQuestion(template.id, questionDialog.question.id, fd)
                  : addQuestion(
                      template.id,
                      orgId,
                      questionDialog.sectionId,
                      questions.filter((q) => q.section_id === questionDialog.sectionId).length,
                      fd
                    );
                startTransition(async () => {
                  const res = await promise;
                  if (res?.error) toast.error(res.error);
                  else {
                    toast.success("تم الحفظ");
                    setQuestionDialog(null);
                    router.refresh();
                  }
                });
              }}
              className="flex flex-col gap-4"
            >
              <QuestionFormFields defaults={questionDialog.question as unknown as Record<string, unknown>} />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    إلغاء
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  حفظ
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
