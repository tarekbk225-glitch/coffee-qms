// AI-assisted field extraction for the "attach a file and let it fill the
// form" feature on the certificates and documents create pages.
//
// This module is server-only: it reads process.env.ANTHROPIC_API_KEY and
// calls the Anthropic API directly over fetch (no SDK dependency needed).
// Only import it from "use server" action files, never from client
// components - it would leak the API key into the client bundle otherwise.

import { certificateTypeLabels, documentTypeLabels } from "@/lib/labels";
import type { CertificateType, DocumentType } from "@/types/database";

export interface ExtractResult<T> {
  data?: T;
  error?: string;
}

export interface ExtractedCertificateFields {
  name_ar?: string | null;
  name?: string | null;
  certificate_type?: CertificateType | null;
  issuing_authority?: string | null;
  external_reference?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
}

export interface ExtractedDocumentFields {
  title_ar?: string | null;
  title?: string | null;
  document_type?: DocumentType | null;
  notes?: string | null;
}

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB - generous for a scanned certificate, well under API limits
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function apiKey() {
  return process.env.ANTHROPIC_API_KEY;
}

function stripCodeFence(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

function cleanDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return DATE_RE.test(value) ? value : null;
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function callClaude(
  file: File,
  promptText: string,
): Promise<ExtractResult<Record<string, unknown>>> {
  const key = apiKey();
  if (!key) {
    return {
      error:
        "لم يتم إعداد مفتاح الذكاء الاصطناعي بعد (ANTHROPIC_API_KEY). الرجاء إضافته من إعدادات المتغيرات البيئية في Netlify ثم إعادة النشر.",
    };
  }

  if (file.size === 0) return { error: "الملف فارغ." };
  if (file.size > MAX_FILE_BYTES) return { error: "حجم الملف كبير جدًا (الحد الأقصى 15 ميجابايت)." };

  const isPdf = file.type === "application/pdf";
  const isImage = /^image\/(jpeg|png|webp|gif)$/.test(file.type);
  if (!isPdf && !isImage) {
    return { error: "صيغة الملف غير مدعومة. الرجاء رفع ملف PDF أو صورة (JPG/PNG/WEBP)." };
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const contentBlock = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
    : { type: "image", source: { type: "base64", media_type: file.type, data: base64 } };

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [contentBlock, { type: "text", text: promptText }],
          },
        ],
      }),
    });
  } catch {
    return { error: "تعذر الاتصال بخدمة الذكاء الاصطناعي. تحقق من الاتصال بالإنترنت وحاول مرة أخرى." };
  }

  if (!response.ok) {
    if (response.status === 401) return { error: "مفتاح الذكاء الاصطناعي غير صالح. تحقق من ANTHROPIC_API_KEY." };
    if (response.status === 429) return { error: "تم تجاوز حد الاستخدام المسموح، حاول بعد قليل." };
    return { error: `تعذرت قراءة الملف بالذكاء الاصطناعي (خطأ ${response.status}).` };
  }

  const json = (await response.json()) as { content?: { type: string; text?: string }[] };
  const text = json.content?.find((b) => b.type === "text")?.text;
  if (!text) return { error: "لم يرد الذكاء الاصطناعي بأي بيانات، حاول مرة أخرى." };

  try {
    const parsed = JSON.parse(stripCodeFence(text));
    return { data: parsed };
  } catch {
    return { error: "تعذر فهم استجابة الذكاء الاصطناعي، حاول مرة أخرى أو أدخل البيانات يدويًا." };
  }
}

export async function extractCertificateFields(file: File): Promise<ExtractResult<ExtractedCertificateFields>> {
  const typeOptions = Object.entries(certificateTypeLabels)
    .map(([value, label]) => `"${value}" (${label.ar})`)
    .join("، ");

  const prompt = `اقرأ هذه الوثيقة الرسمية (شهادة أو ترخيص لمصنع غذائي في السعودية) واستخرج البيانات التالية بصيغة JSON فقط، بدون أي نص إضافي أو علامات markdown:
{
  "name_ar": "اسم الشهادة/الترخيص بالعربية كما هو مكتوب",
  "name": "الاسم بالإنجليزية إن وجد وإلا null",
  "certificate_type": "أحد القيم التالية بالضبط: ${typeOptions} - اختر الأقرب لنوع الوثيقة",
  "issuing_authority": "الجهة المُصدرة",
  "external_reference": "الرقم الرسمي/رقم الشهادة أو الترخيص إن وجد",
  "issue_date": "تاريخ الإصدار بصيغة YYYY-MM-DD ميلادي، أو null إن لم يوجد",
  "expiry_date": "تاريخ الانتهاء بصيغة YYYY-MM-DD ميلادي، أو null إن لم يوجد",
  "notes": "أي ملاحظات إضافية مفيدة، وإذا كان أي تاريخ في الوثيقة مكتوبًا بالتقويم الهجري فاذكر هنا التاريخ الهجري الأصلي ونبّه أن التحويل للميلادي تقريبي ويحتاج تأكيد"
}
لا تخترع بيانات غير موجودة في الوثيقة - استخدم null لأي حقل غير متوفر.`;

  const result = await callClaude(file, prompt);
  if (result.error) return { error: result.error };

  const d = result.data ?? {};
  const rawType = typeof d.certificate_type === "string" ? d.certificate_type : "other";
  const certificate_type = (rawType in certificateTypeLabels ? rawType : "other") as CertificateType;

  return {
    data: {
      name_ar: cleanString(d.name_ar),
      name: cleanString(d.name),
      certificate_type,
      issuing_authority: cleanString(d.issuing_authority),
      external_reference: cleanString(d.external_reference),
      issue_date: cleanDate(d.issue_date),
      expiry_date: cleanDate(d.expiry_date),
      notes: cleanString(d.notes),
    },
  };
}

export async function extractDocumentFields(file: File): Promise<ExtractResult<ExtractedDocumentFields>> {
  const typeOptions = Object.entries(documentTypeLabels)
    .map(([value, label]) => `"${value}" (${label.ar})`)
    .join("، ");

  const prompt = `اقرأ هذه الوثيقة (مستند إجرائي أو سياسة داخل نظام إدارة الجودة لمصنع غذائي) واستخرج البيانات التالية بصيغة JSON فقط، بدون أي نص إضافي أو علامات markdown:
{
  "title_ar": "عنوان المستند بالعربية",
  "title": "العنوان بالإنجليزية إن وجد وإلا null",
  "document_type": "أحد القيم التالية بالضبط: ${typeOptions} - اختر الأقرب لنوع المستند",
  "notes": "ملخص قصير أو ملاحظات مفيدة عن محتوى المستند"
}
لا تخترع بيانات غير موجودة في الوثيقة - استخدم null لأي حقل غير متوفر.`;

  const result = await callClaude(file, prompt);
  if (result.error) return { error: result.error };

  const d = result.data ?? {};
  const rawType = typeof d.document_type === "string" ? d.document_type : "other";
  const document_type = (rawType in documentTypeLabels ? rawType : "other") as DocumentType;

  return {
    data: {
      title_ar: cleanString(d.title_ar),
      title: cleanString(d.title),
      document_type,
      notes: cleanString(d.notes),
    },
  };
}
