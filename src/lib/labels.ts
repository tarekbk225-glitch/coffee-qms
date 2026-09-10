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

export const sanitationStationTypeLabels: LabelMap<
  "bait_station" | "insect_light_trap" | "pheromone_trap" | "rodent_trap" | "sanitation_checkpoint" | "other"
> = {
  bait_station: { ar: "محطة طعم", en: "Bait Station" },
  insect_light_trap: { ar: "مصيدة ضوئية للحشرات", en: "Insect Light Trap" },
  pheromone_trap: { ar: "مصيدة فرمونية", en: "Pheromone Trap" },
  rodent_trap: { ar: "مصيدة قوارض", en: "Rodent Trap" },
  sanitation_checkpoint: { ar: "نقطة تفتيش نظافة", en: "Sanitation Checkpoint" },
  other: { ar: "أخرى", en: "Other" },
};

export const sanitationStationStatusLabels: LabelMap<"active" | "inactive" | "removed"> = {
  active: { ar: "نشطة", en: "Active" },
  inactive: { ar: "غير نشطة", en: "Inactive" },
  removed: { ar: "مُزالة", en: "Removed" },
};

export const pestActivityLevelLabels: LabelMap<"none" | "low" | "medium" | "high"> = {
  none: { ar: "لا يوجد نشاط", en: "None" },
  low: { ar: "منخفض", en: "Low" },
  medium: { ar: "متوسط", en: "Medium" },
  high: { ar: "مرتفع", en: "High" },
};

export const sanitationConditionLabels: LabelMap<"clean" | "needs_attention" | "dirty"> = {
  clean: { ar: "نظيف", en: "Clean" },
  needs_attention: { ar: "يحتاج متابعة", en: "Needs Attention" },
  dirty: { ar: "غير نظيف", en: "Dirty" },
};

export const documentTypeLabels: LabelMap<
  | "sop"
  | "policy"
  | "work_instruction"
  | "form"
  | "specification"
  | "haccp_document"
  | "cleaning_procedure"
  | "maintenance_procedure"
  | "other"
> = {
  sop: { ar: "إجراء تشغيل قياسي (SOP)", en: "SOP" },
  policy: { ar: "سياسة", en: "Policy" },
  work_instruction: { ar: "تعليمات عمل", en: "Work Instruction" },
  form: { ar: "نموذج", en: "Form" },
  specification: { ar: "مواصفة", en: "Specification" },
  haccp_document: { ar: "مستند HACCP", en: "HACCP Document" },
  cleaning_procedure: { ar: "إجراء نظافة", en: "Cleaning Procedure" },
  maintenance_procedure: { ar: "إجراء صيانة", en: "Maintenance Procedure" },
  other: { ar: "أخرى", en: "Other" },
};

export const documentStatusLabels: LabelMap<"draft" | "review" | "approved" | "active" | "obsolete"> = {
  draft: { ar: "مسودة", en: "Draft" },
  review: { ar: "قيد المراجعة", en: "Under Review" },
  approved: { ar: "معتمد", en: "Approved" },
  active: { ar: "ساري", en: "Active" },
  obsolete: { ar: "ملغى", en: "Obsolete" },
};

export const certificateTypeLabels: LabelMap<
  | "municipality_license"
  | "health_certificate"
  | "civil_defense_certificate"
  | "environmental_approval"
  | "industrial_license"
  | "food_safety_certification"
  | "other"
> = {
  municipality_license: { ar: "شهادة الصلاحية / رخصة البلدية", en: "Municipality License" },
  health_certificate: { ar: "شهادة صحية", en: "Health Certificate" },
  civil_defense_certificate: { ar: "شهادة الدفاع المدني", en: "Civil Defense Certificate" },
  environmental_approval: { ar: "موافقة بيئية", en: "Environmental Approval" },
  industrial_license: { ar: "رخصة صناعية", en: "Industrial License" },
  food_safety_certification: { ar: "شهادة سلامة غذائية (ISO 22000 / HACCP)", en: "Food Safety Certification" },
  other: { ar: "أخرى", en: "Other" },
};

export const certificateStatusLabels: LabelMap<"active" | "renewed" | "cancelled"> = {
  active: { ar: "سارية", en: "Active" },
  renewed: { ar: "تم التجديد", en: "Renewed" },
  cancelled: { ar: "ملغاة", en: "Cancelled" },
};

export function certificateExpiryTone(expiryDate: string | null): "success" | "warning" | "destructive" | "neutral" {
  if (!expiryDate) return "neutral";
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return "destructive";
  if (days <= 30) return "warning";
  return "success";
}

// A certificate keeps a DB status of "active" until a person marks it
// "renewed" or "cancelled" - the stored status alone never reflects an
// expiry date that has simply passed. This derives what should actually be
// shown to the user: once expiry_date is in the past, an "active" record
// displays as "منتهية الصلاحية" (Expired) instead of "سارية" (Active),
// both in badge color and label text.
export function certificateDisplayStatus(
  status: "active" | "renewed" | "cancelled",
  expiryDate: string | null,
): { key: "active" | "renewed" | "cancelled" | "expired"; label: { ar: string; en: string } } {
  if (status === "active" && expiryDate && new Date(expiryDate).getTime() < Date.now()) {
    return { key: "expired", label: { ar: "منتهية الصلاحية", en: "Expired" } };
  }
  return { key: status, label: certificateStatusLabels[status] };
}

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
  sanitation_stations: { ar: "محطة نظافة / مكافحة حشرات", en: "Sanitation/Pest Station" },
  sanitation_checks: { ar: "فحص نظافة / مكافحة حشرات", en: "Sanitation/Pest Check" },
  documents: { ar: "مستند", en: "Document" },
  certificates: { ar: "شهادة / ترخيص", en: "Certificate/License" },
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
  const positive = ["published", "approved", "closed", "pass", "active", "clean", "renewed"];
  const negative = ["rejected", "critical", "fail", "retired", "dirty", "removed", "obsolete", "cancelled", "expired"];
  const warn = [
    "under_review",
    "verification",
    "action_required",
    "investigation",
    "high",
    "urgent",
    "needs_attention",
    "review",
  ];
  if (positive.includes(status)) return "success" as const;
  if (negative.includes(status)) return "destructive" as const;
  if (warn.includes(status)) return "warning" as const;
  return "neutral" as const;
}

export function badgeToneForPestActivity(level: "none" | "low" | "medium" | "high") {
  return { none: "neutral", low: "neutral", medium: "warning", high: "destructive" }[level] as
    | "neutral"
    | "warning"
    | "destructive";
}
