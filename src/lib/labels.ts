// Centralized Arabic-first bilingual labels for every enum in the schema.
// Keeping these in one file means adding English later is a matter of
// flipping which key each component reads, not hunting through the UI.

type LabelMap<T extends string> = Record<T, { ar: string; en: string }>;

export const templateStatusLabels: LabelMap<
  "draft" | "under_review" | "approved" | "published" | "archived"
> = {
  draft: { ar: "مسودة", en: "Draft" },
  under_review: { ar: "قيد المراجعة", en: "Under Review" },
  approved: { ar: "معتمد", en: "Approved" },
  published: { ar: "منشور", en: "Published" },
  archived: { ar: "مؤرشف", en: "Archived" },
};

export const inspectionStatusLabels: LabelMap<
  | "scheduled"
  | "in_progress"
  | "completed"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "closed"
  | "cancelled"
> = {
  scheduled: { ar: "مجدول", en: "Scheduled" },
  in_progress: { ar: "قيد التنفيذ", en: "In Progress" },
  completed: { ar: "مكتمل", en: "Completed" },
  submitted: { ar: "مُرسل", en: "Submitted" },
  under_review: { ar: "قيد المراجعة", en: "Under Review" },
  approved: { ar: "معتمد", en: "Approved" },
  rejected: { ar: "مرفوض", en: "Rejected" },
  closed: { ar: "مغلق", en: "Closed" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
};

export const answerStatusLabels: LabelMap<"pending" | "pass" | "fail" | "na"> = {
  pending: { ar: "بانتظار الإجابة", en: "Pending" },
  pass: { ar: "مطابق", en: "Pass" },
  fail: { ar: "غير مطابق", en: "Fail" },
  na: { ar: "مسجّل", en: "Recorded" },
};

export const findingSeverityLabels: LabelMap<"low" | "medium" | "high" | "critical"> = {
  low: { ar: "منخفضة", en: "Low" },
  medium: { ar: "متوسطة", en: "Medium" },
  high: { ar: "عالية", en: "High" },
  critical: { ar: "حرجة", en: "Critical" },
};

export const findingStatusLabels: LabelMap<
  "open" | "assigned" | "investigation" | "action_required" | "verification" | "closed" | "rejected"
> = {
  open: { ar: "مفتوحة", en: "Open" },
  assigned: { ar: "مُسندة", en: "Assigned" },
  investigation: { ar: "قيد التحقيق", en: "Investigation" },
  action_required: { ar: "بانتظار إجراء", en: "Action Required" },
  verification: { ar: "قيد التحقق", en: "Verification" },
  closed: { ar: "مغلقة", en: "Closed" },
  rejected: { ar: "مرفوضة", en: "Rejected" },
};

export const capaStatusLabels: LabelMap<
  "open" | "assigned" | "in_progress" | "submitted" | "verification" | "approved" | "closed" | "rejected"
> = {
  open: { ar: "مفتوح", en: "Open" },
  assigned: { ar: "مُسند", en: "Assigned" },
  in_progress: { ar: "قيد التنفيذ", en: "In Progress" },
  submitted: { ar: "مُرسل للتحقق", en: "Submitted" },
  verification: { ar: "قيد التحقق", en: "Verification" },
  approved: { ar: "معتمد", en: "Approved" },
  closed: { ar: "مغلق", en: "Closed" },
  rejected: { ar: "مرفوض", en: "Rejected" },
};

export const capaPriorityLabels: LabelMap<"low" | "medium" | "high" | "urgent"> = {
  low: { ar: "منخفضة", en: "Low" },
  medium: { ar: "متوسطة", en: "Medium" },
  high: { ar: "عالية", en: "High" },
  urgent: { ar: "عاجلة", en: "Urgent" },
};

export const assetStatusLabels: LabelMap<"active" | "inactive" | "under_maintenance" | "retired"> = {
  active: { ar: "نشط", en: "Active" },
  inactive: { ar: "غير نشط", en: "Inactive" },
  under_maintenance: { ar: "تحت الصيانة", en: "Under Maintenance" },
  retired: { ar: "متوقف", en: "Retired" },
};

export const assetCriticalityLabels: LabelMap<"low" | "medium" | "high" | "critical"> = {
  low: { ar: "منخفضة", en: "Low" },
  medium: { ar: "متوسطة", en: "Medium" },
  high: { ar: "عالية", en: "High" },
  critical: { ar: "حرجة", en: "Critical" },
};

export const questionTypeLabels: LabelMap<
  | "yes_no"
  | "pass_fail"
  | "compliant_non_compliant"
  | "text"
  | "long_text"
  | "number"
  | "decimal"
  | "temperature"
  | "date"
  | "time"
  | "dropdown"
  | "multi_select"
  | "photo"
  | "video"
  | "attachment"
  | "signature"
> = {
  yes_no: { ar: "نعم / لا", en: "Yes / No" },
  pass_fail: { ar: "مطابق / غير مطابق", en: "Pass / Fail" },
  compliant_non_compliant: { ar: "متوافق / غير متوافق", en: "Compliant / Non-Compliant" },
  text: { ar: "نص قصير", en: "Text" },
  long_text: { ar: "نص طويل", en: "Long Text" },
  number: { ar: "رقم", en: "Number" },
  decimal: { ar: "رقم عشري", en: "Decimal" },
  temperature: { ar: "درجة حرارة", en: "Temperature" },
  date: { ar: "تاريخ", en: "Date" },
  time: { ar: "وقت", en: "Time" },
  dropdown: { ar: "قائمة منسدلة", en: "Dropdown" },
  multi_select: { ar: "اختيار متعدد", en: "Multi Select" },
  photo: { ar: "صورة", en: "Photo" },
  video: { ar: "فيديو", en: "Video" },
  attachment: { ar: "مرفق", en: "Attachment" },
  signature: { ar: "توقيع", en: "Signature" },
};

export const siteTypeLabels: LabelMap<"factory" | "branch" | "warehouse" | "office"> = {
  factory: { ar: "مصنع", en: "Factory" },
  branch: { ar: "فرع", en: "Branch" },
  warehouse: { ar: "مستودع", en: "Warehouse" },
  office: { ar: "مكتب", en: "Office" },
};

export const auditActionLabels: LabelMap<
  "created" | "updated" | "assigned" | "status_changed" | "submitted" | "approved" | "rejected" | "closed" | "reopened" | "deleted"
> = {
  created: { ar: "إنشاء", en: "Created" },
  updated: { ar: "تعديل", en: "Updated" },
  assigned: { ar: "إسناد", en: "Assigned" },
  status_changed: { ar: "تغيير الحالة", en: "Status Changed" },
  submitted: { ar: "إرسال", en: "Submitted" },
  approved: { ar: "اعتماد", en: "Approved" },
  rejected: { ar: "رفض", en: "Rejected" },
  closed: { ar: "إغلاق", en: "Closed" },
  reopened: { ar: "إعادة فتح", en: "Reopened" },
  deleted: { ar: "حذف", en: "Deleted" },
};

export const auditEntityLabels: Record<string, { ar: string; en: string }> = {
  organizations: { ar: "المنظمة", en: "Organization" },
  sites: { ar: "الموقع", en: "Site" },
  departments: { ar: "القسم", en: "Department" },
  areas: { ar: "المنطقة", en: "Area" },
  teams: { ar: "الفريق", en: "Team" },
  templates: { ar: "قالب تفتيش", en: "Template" },
  template_sections: { ar: "قسم قالب", en: "Template Section" },
  template_questions: { ar: "سؤال قالب", en: "Template Question" },
  inspections: { ar: "تفتيش", en: "Inspection" },
  inspection_answers: { ar: "إجابة تفتيش", en: "Inspection Answer" },
  inspection_schedules: { ar: "جدولة تفتيش", en: "Inspection Schedule" },
  findings: { ar: "ملاحظة", en: "Finding" },
  capas: { ar: "إجراء تصحيحي", en: "CAPA" },
  assets: { ar: "أصل / معدة", en: "Asset" },
  evidence_files: { ar: "ملف دليل", en: "Evidence File" },
};

export function auditEntityLabel(entityType: string) {
  return auditEntityLabels[entityType]?.ar ?? entityType;
}

export function badgeToneForAuditAction(action: string) {
  const positive = ["created", "approved", "closed"];
  const negative = ["rejected", "deleted"];
  const warn = ["status_changed", "reopened", "submitted", "assigned"];
  if (positive.includes(action)) return "success" as const;
  if (negative.includes(action)) return "destructive" as const;
  if (warn.includes(action)) return "warning" as const;
  return "neutral" as const;
}

export function badgeToneForFindingSeverity(s: keyof typeof findingSeverityLabels) {
  return { low: "neutral", medium: "warning", high: "danger", critical: "destructive" }[s] as
    | "neutral"
    | "warning"
    | "danger"
    | "destructive";
}

export function badgeToneForStatus(status: string) {
  const positive = ["published", "approved", "closed", "pass", "active"];
  const negative = ["rejected", "critical", "fail", "retired"];
  const warn = ["under_review", "verification", "action_required", "investigation", "high", "urgent"];
  if (positive.includes(status)) return "success" as const;
  if (negative.includes(status)) return "destructive" as const;
  if (warn.includes(status)) return "warning" as const;
  return "neutral" as const;
}
