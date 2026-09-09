"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  PlayCircle,
  Send,
  Eye,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EvidenceUploader } from "@/components/shared/evidence-uploader";
import { SignaturePad } from "@/components/shared/signature-pad";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { inspectionStatusLabels, answerStatusLabels, findingSeverityLabels } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { changeInspectionStatus, saveAnswer, updateInspectionComments } from "../actions";
import { cn } from "@/lib/utils";
import type { Database, InspectionStatus } from "@/types/database";

type Inspection = Database["public"]["Tables"]["inspections"]["Row"] & {
  templates: { id: string; name: string; name_ar: string | null } | null;
  sites: { name_ar: string | null; name: string } | null;
  departments: { name_ar: string | null; name: string } | null;
  areas: { name_ar: string | null; name: string } | null;
  inspector: { id: string; full_name: string; full_name_ar: string | null } | null;
};
type Section = Database["public"]["Tables"]["template_sections"]["Row"];
type Question = Database["public"]["Tables"]["template_questions"]["Row"];
type Answer = Database["public"]["Tables"]["inspection_answers"]["Row"];
type Finding = { id: string; finding_number: string; severity: string; status: string; description: string };

interface LocalAnswer {
  id?: string;
  status: string;
  value_bool?: boolean | null;
  value_number?: number | null;
  value_text?: string | null;
  value_option?: unknown;
  value_date?: string | null;
  value_time?: string | null;
  comment?: string | null;
}

function computeLocalStatus(q: Question, a: LocalAnswer): string {
  switch (q.type) {
    case "yes_no":
      if (a.value_bool === undefined || a.value_bool === null) return "pending";
      return (q.polarity === "positive") === a.value_bool ? "pass" : "fail";
    case "pass_fail":
      return a.value_text === "pass" ? "pass" : a.value_text === "fail" ? "fail" : "pending";
    case "compliant_non_compliant":
      return a.value_text === "compliant" ? "pass" : a.value_text === "non_compliant" ? "fail" : "pending";
    case "number":
    case "decimal":
    case "temperature": {
      if (a.value_number === undefined || a.value_number === null) return "pending";
      const min = q.min_value === null ? -Infinity : q.min_value;
      const max = q.max_value === null ? Infinity : q.max_value;
      return a.value_number >= min && a.value_number <= max ? "pass" : "fail";
    }
    default:
      return a.value_text || a.value_option || a.value_date || a.value_time ? "na" : "pending";
  }
}

export function InspectionWorkspace({
  inspection,
  sections,
  questions,
  answers,
  findings,
  orgId,
  canExecute,
  canReview,
  canApprove,
  canReschedule,
}: {
  inspection: Inspection;
  sections: Section[];
  questions: Question[];
  answers: Answer[];
  findings: Finding[];
  orgId: string;
  canExecute: boolean;
  canReview: boolean;
  canApprove: boolean;
  canReschedule: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<InspectionStatus>(inspection.status);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [localAnswers, setLocalAnswers] = useState<Record<string, LocalAnswer>>(() => {
    const map: Record<string, LocalAnswer> = {};
    answers.forEach((a) => {
      map[a.question_id] = { ...a };
    });
    return map;
  });
  const [comments, setComments] = useState(inspection.comments ?? "");

  const editable = canExecute && (status === "scheduled" || status === "in_progress");
  const orderedSections = sections;
  const currentSection = orderedSections[sectionIdx];
  const currentQuestions = questions.filter((q) => q.section_id === currentSection?.id);

  const progressBySection = orderedSections.map((s) => {
    const qs = questions.filter((q) => q.section_id === s.id);
    const answered = qs.filter((q) => localAnswers[q.id] && computeLocalStatus(q, localAnswers[q.id]) !== "pending").length;
    return { total: qs.length, answered };
  });
  const totalQuestions = questions.length;
  const totalAnswered = Object.keys(localAnswers).filter((qId) => {
    const q = questions.find((qq) => qq.id === qId);
    return q && computeLocalStatus(q, localAnswers[qId]) !== "pending";
  }).length;

  function persist(question: Question, patch: Partial<LocalAnswer>) {
    const next: LocalAnswer = { ...(localAnswers[question.id] ?? { status: "pending" }), ...patch };
    next.status = computeLocalStatus(question, next);
    setLocalAnswers((prev) => ({ ...prev, [question.id]: next }));

    startTransition(async () => {
      const res = await saveAnswer(inspection.id, {
        question_id: question.id,
        section_id: question.section_id,
        value_bool: next.value_bool,
        value_number: next.value_number,
        value_text: next.value_text,
        value_option: next.value_option,
        value_date: next.value_date,
        value_time: next.value_time,
        comment: next.comment,
      });
      if (res.error) toast.error(res.error);
      else if (res.answerId) {
        setLocalAnswers((prev) => ({ ...prev, [question.id]: { ...prev[question.id], id: res.answerId, status: res.status ?? prev[question.id].status } }));
      }
      // First answer on a scheduled inspection silently moves it to in_progress.
      if (status === "scheduled") {
        await changeInspectionStatus(inspection.id, "in_progress");
        setStatus("in_progress");
      }
    });
  }

  function transition(next: InspectionStatus) {
    startTransition(async () => {
      const res = await changeInspectionStatus(inspection.id, next);
      if (res.error) toast.error(res.error);
      else {
        toast.success("تم تحديث الحالة");
        setStatus(next);
        router.refresh();
      }
    });
  }

  const criticalFails = Object.entries(localAnswers).filter(([qId, a]) => {
    const q = questions.find((qq) => qq.id === qId);
    return q?.is_critical && computeLocalStatus(q, a) === "fail";
  });
  const totalFails = Object.entries(localAnswers).filter(([qId, a]) => {
    const q = questions.find((qq) => qq.id === qId);
    return q && computeLocalStatus(q, a) === "fail";
  }).length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={inspection.templates?.name_ar || inspection.templates?.name || "تفتيش"}
        description={`${inspection.sites?.name_ar || ""} ${inspection.departments?.name_ar ? "· " + inspection.departments?.name_ar : ""} · ${formatDate(inspection.scheduled_date)}`}
        actions={<StatusBadge status={status} label={inspectionStatusLabels[status].ar} />}
      />

      {!editable && !["scheduled"].includes(status) && (
        <Card className="mb-4">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <div className="flex items-center gap-4 text-sm">
              <span>
                النتيجة: <b className="tabular-nums">{inspection.score ?? "—"}</b>
              </span>
              <span>
                نسبة الالتزام: <b className="tabular-nums">{inspection.compliance_percent ?? "—"}%</b>
              </span>
              <span>
                المفتش: <b>{inspection.inspector?.full_name_ar || inspection.inspector?.full_name || "—"}</b>
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {status === "submitted" && canReview && (
                <Button size="sm" onClick={() => transition("under_review")} disabled={isPending}>
                  <Eye className="h-3.5 w-3.5" /> بدء المراجعة
                </Button>
              )}
              {status === "under_review" && canApprove && (
                <>
                  <Button size="sm" onClick={() => transition("approved")} disabled={isPending}>
                    <ThumbsUp className="h-3.5 w-3.5" /> اعتماد
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => transition("rejected")} disabled={isPending}>
                    <ThumbsDown className="h-3.5 w-3.5" /> رفض
                  </Button>
                </>
              )}
              {status === "rejected" && (canExecute || canReschedule) && (
                <Button size="sm" onClick={() => transition("in_progress")} disabled={isPending}>
                  إعادة فتح للتصحيح
                </Button>
              )}
              {status === "approved" && canApprove && (
                <Button size="sm" onClick={() => transition("closed")} disabled={isPending}>
                  إغلاق التفتيش
                </Button>
              )}
              {["scheduled", "in_progress"].includes(status) && canReschedule && (
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => transition("cancelled")} disabled={isPending}>
                  إلغاء
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {findings.length > 0 && (
        <Card className="mb-4 border-destructive/30">
          <CardContent className="pt-6">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4" /> ملاحظات عدم مطابقة نتجت عن هذا التفتيش
            </p>
            <ul className="flex flex-col gap-1.5">
              {findings.map((f) => (
                <li key={f.id}>
                  <Link href={`/findings/${f.id}`} className="flex items-center gap-2 text-sm hover:underline">
                    <Badge variant={f.severity === "critical" ? "destructive" : "warning"}>{findingSeverityLabels[f.severity as keyof typeof findingSeverityLabels].ar}</Badge>
                    <span className="font-medium" dir="ltr">
                      {f.finding_number}
                    </span>
                    <span className="truncate text-muted-foreground">{f.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {status === "scheduled" && editable && (
        <Card className="mb-4">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <PlayCircle className="h-10 w-10 text-accent" />
            <p className="font-medium">هذا التفتيش لم يبدأ بعد</p>
            <p className="text-sm text-muted-foreground">اضغط للبدء بالإجابة على الأسئلة قسمًا تلو الآخر</p>
            <Button onClick={() => transition("in_progress")} disabled={isPending}>
              بدء التفتيش
            </Button>
          </CardContent>
        </Card>
      )}

      {status !== "scheduled" && (
        <>
          {editable && (
            <div className="mb-4">
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  القسم {sectionIdx + 1} من {orderedSections.length}
                </span>
                <span>
                  {totalAnswered} / {totalQuestions} تمت الإجابة عليها
                </span>
              </div>
              <Progress value={totalQuestions ? (totalAnswered / totalQuestions) * 100 : 0} />
              <div className="mt-2 flex items-center gap-1">
                {progressBySection.map((p, i) => (
                  <button
                    key={orderedSections[i]?.id ?? i}
                    type="button"
                    onClick={() => setSectionIdx(i)}
                    title={orderedSections[i]?.title_ar || orderedSections[i]?.title}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-colors",
                      i === sectionIdx
                        ? "bg-primary"
                        : p.total > 0 && p.answered === p.total
                          ? "bg-emerald-400"
                          : p.answered > 0
                            ? "bg-amber-400"
                            : "bg-muted"
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {(editable ? [currentSection].filter(Boolean) : orderedSections).map((section) => (
              <Card key={section!.id}>
                <CardContent className="flex flex-col gap-5 pt-6">
                  <h3 className="font-semibold">{section!.title_ar || section!.title}</h3>
                  {(editable ? currentQuestions : questions.filter((q) => q.section_id === section!.id)).map((q) => (
                    <QuestionField
                      key={q.id}
                      question={q}
                      answer={localAnswers[q.id]}
                      editable={editable}
                      orgId={orgId}
                      onChange={(patch) => persist(q, patch)}
                    />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {editable && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button variant="outline" disabled={sectionIdx === 0} onClick={() => setSectionIdx((i) => i - 1)}>
                <ChevronRight className="h-4 w-4" /> السابق
              </Button>

              {sectionIdx < orderedSections.length - 1 ? (
                <Button onClick={() => setSectionIdx((i) => i + 1)}>
                  التالي <ChevronLeft className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => transition("completed")} disabled={isPending}>
                  <CheckCircle2 className="h-4 w-4" /> إنهاء التفتيش
                </Button>
              )}
            </div>
          )}

          {status === "completed" && (canExecute || canReschedule) && (
            <Card className="mt-4">
              <CardContent className="flex flex-col gap-3 pt-6">
                {totalFails > 0 && (
                  <p className="flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400">
                    <ShieldAlert className="h-4 w-4" /> تم تسجيل {totalFails} بند غير مطابق ({criticalFails.length} حرج) - سيتم إرسال ملاحظات تلقائيًا
                  </p>
                )}
                <Textarea
                  placeholder="ملاحظات عامة على التفتيش (اختياري)"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  onBlur={() => updateInspectionComments(inspection.id, comments)}
                  rows={3}
                />
                <Button onClick={() => transition("submitted")} disabled={isPending} className="self-start">
                  <Send className="h-4 w-4" /> إرسال للمراجعة
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function QuestionField({
  question,
  answer,
  editable,
  orgId,
  onChange,
}: {
  question: Question;
  answer?: LocalAnswer;
  editable: boolean;
  orgId: string;
  onChange: (patch: Partial<LocalAnswer>) => void;
}) {
  const status = answer ? computeLocalStatus(question, answer) : "pending";
  const isFail = status === "fail";
  const options = (question.options as { value: string; label: string }[] | null) ?? [];

  return (
    <div className={`rounded-lg border p-3 ${isFail ? (question.is_critical ? "border-destructive/50 bg-destructive/5" : "border-amber-500/40 bg-amber-500/5") : ""}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-medium">
          {question.prompt_ar || question.prompt}
          {question.is_required && <span className="text-destructive"> *</span>}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {question.is_critical && (
            <Badge variant="destructive" className="gap-1">
              <ShieldAlert className="h-3 w-3" /> حرج
            </Badge>
          )}
          {status !== "pending" && (
            <Badge variant={status === "fail" ? "destructive" : status === "pass" ? "success" : "neutral"}>
              {answerStatusLabels[status as keyof typeof answerStatusLabels].ar}
            </Badge>
          )}
        </div>
      </div>
      {question.instructions && <p className="mb-2 text-xs text-muted-foreground">{question.instructions}</p>}

      {!editable ? (
        <div className="flex flex-col gap-2">
          <ReadOnlyValue question={question} answer={answer} />
          {answer?.comment && <p className="rounded-md bg-muted/50 px-2 py-1 text-xs text-muted-foreground">{answer.comment}</p>}
          {answer?.id && <EvidenceUploader organizationId={orgId} entityType="inspection_answer" entityId={answer.id} readOnly />}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {question.type === "yes_no" && (
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={answer?.value_bool === true ? "default" : "outline"} onClick={() => onChange({ value_bool: true })}>
                نعم
              </Button>
              <Button type="button" size="sm" variant={answer?.value_bool === false ? "default" : "outline"} onClick={() => onChange({ value_bool: false })}>
                لا
              </Button>
            </div>
          )}

          {question.type === "pass_fail" && (
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={answer?.value_text === "pass" ? "success" : "outline"} onClick={() => onChange({ value_text: "pass" })}>
                مطابق
              </Button>
              <Button type="button" size="sm" variant={answer?.value_text === "fail" ? "destructive" : "outline"} onClick={() => onChange({ value_text: "fail" })}>
                غير مطابق
              </Button>
            </div>
          )}

          {question.type === "compliant_non_compliant" && (
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={answer?.value_text === "compliant" ? "success" : "outline"} onClick={() => onChange({ value_text: "compliant" })}>
                متوافق
              </Button>
              <Button type="button" size="sm" variant={answer?.value_text === "non_compliant" ? "destructive" : "outline"} onClick={() => onChange({ value_text: "non_compliant" })}>
                غير متوافق
              </Button>
            </div>
          )}

          {(question.type === "number" || question.type === "decimal" || question.type === "temperature") && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="any"
                className="max-w-[160px]"
                defaultValue={answer?.value_number ?? ""}
                onBlur={(e) => onChange({ value_number: e.target.value === "" ? null : Number(e.target.value) })}
              />
              <span className="text-xs text-muted-foreground">
                {question.unit} {(question.min_value !== null || question.max_value !== null) && `(المدى: ${question.min_value ?? "—"} - ${question.max_value ?? "—"})`}
              </span>
            </div>
          )}

          {question.type === "text" && (
            <Input defaultValue={answer?.value_text ?? ""} onBlur={(e) => onChange({ value_text: e.target.value })} />
          )}

          {question.type === "long_text" && (
            <Textarea rows={3} defaultValue={answer?.value_text ?? ""} onBlur={(e) => onChange({ value_text: e.target.value })} />
          )}

          {question.type === "date" && (
            <Input type="date" defaultValue={answer?.value_date ?? ""} onChange={(e) => onChange({ value_date: e.target.value })} />
          )}

          {question.type === "time" && (
            <Input type="time" defaultValue={answer?.value_time ?? ""} onChange={(e) => onChange({ value_time: e.target.value })} />
          )}

          {question.type === "dropdown" && (
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              defaultValue={answer?.value_text ?? ""}
              onChange={(e) => onChange({ value_text: e.target.value })}
            >
              <option value="">اختر...</option>
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}

          {question.type === "multi_select" && (
            <div className="flex flex-wrap gap-3">
              {options.map((o) => {
                const selected = ((answer?.value_option as string[] | undefined) ?? []).includes(o.value);
                return (
                  <label key={o.value} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={selected}
                      onCheckedChange={(checked) => {
                        const current = (answer?.value_option as string[] | undefined) ?? [];
                        const next = checked ? [...current, o.value] : current.filter((v) => v !== o.value);
                        onChange({ value_option: next });
                      }}
                    />
                    {o.label}
                  </label>
                );
              })}
            </div>
          )}

          {(question.type === "photo" || question.type === "video" || question.type === "attachment") &&
            (answer?.id ? (
              <EvidenceUploader organizationId={orgId} entityType="inspection_answer" entityId={answer.id} />
            ) : (
              <MaterializeThenUpload onChange={onChange} />
            ))}

          {question.type === "signature" &&
            (answer?.id ? (
              <SignaturePad organizationId={orgId} entityId={answer.id} />
            ) : (
              <MaterializeThenUpload onChange={onChange} signature />
            ))}

          {isFail && (
            <div className="mt-1 flex flex-col gap-2 border-t pt-2">
              {question.require_comment_on_fail && (
                <Textarea
                  placeholder="سبب عدم المطابقة (مطلوب)"
                  rows={2}
                  defaultValue={answer?.comment ?? ""}
                  onBlur={(e) => onChange({ comment: e.target.value })}
                />
              )}
              {question.require_photo_on_fail && answer?.id && (
                <EvidenceUploader organizationId={orgId} entityType="inspection_answer" entityId={answer.id} />
              )}
              <p className="text-xs text-amber-700 dark:text-amber-400">سيتم إنشاء ملاحظة عدم مطابقة تلقائيًا لهذا البند</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// The first click on a photo/video/attachment/signature question has no
// answer row yet (evidence_files needs a real inspection_answer_id to link
// to). This button "materializes" that row via the normal persist() ->
// saveAnswer() path; once answer.id exists the caller switches to rendering
// the real EvidenceUploader / SignaturePad for the actual file upload.
function MaterializeThenUpload({
  onChange,
  signature,
}: {
  onChange: (patch: Partial<LocalAnswer>) => void;
  signature?: boolean;
}) {
  return (
    <Button type="button" size="sm" variant="outline" onClick={() => onChange({ value_text: signature ? "signed" : "attached" })}>
      {signature ? "بدء التوقيع" : "إرفاق ملف"}
    </Button>
  );
}

function ReadOnlyValue({ question, answer }: { question: Question; answer?: LocalAnswer }) {
  if (!answer) return <p className="text-sm text-muted-foreground">لم تتم الإجابة</p>;

  const comment = answer.comment && (
    <p className="mt-1 text-xs text-muted-foreground">سبب عدم المطابقة: {answer.comment}</p>
  );

  if (["photo", "video", "attachment", "signature"].includes(question.type))
    return (
      <div>
        <p className="text-sm text-muted-foreground">{answer.value_text ? "تم إرفاق دليل" : "لا يوجد مرفق"}</p>
        {comment}
      </div>
    );
  if (question.type === "yes_no")
    return (
      <div>
        <p className="text-sm">{answer.value_bool === true ? "نعم" : answer.value_bool === false ? "لا" : "—"}</p>
        {comment}
      </div>
    );
  if (question.type === "number" || question.type === "decimal" || question.type === "temperature")
    return (
      <div>
        <p className="text-sm tabular-nums">
          {answer.value_number ?? "—"} {question.unit}
        </p>
        {comment}
      </div>
    );
  if (question.type === "date") return <p className="text-sm">{answer.value_date ?? "—"}</p>;
  if (question.type === "time") return <p className="text-sm">{answer.value_time ?? "—"}</p>;
  return (
    <div>
      <p className="text-sm">{answer.value_text ?? "—"}</p>
      {comment}
    </div>
  );
}
