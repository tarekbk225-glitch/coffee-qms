"use client";

import { useCallback, useEffect, useState } from "react";
import { Paperclip, X, Upload, FileText, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { EvidenceKind } from "@/types/database";

interface EvidenceItem {
  id: string;
  file_name: string;
  file_path: string;
  kind: EvidenceKind;
  url?: string;
}

function kindFor(file: File): EvidenceKind {
  if (file.type.startsWith("image/")) return "photo";
  if (file.type.startsWith("video/")) return "video";
  return "document";
}

function IconFor({ kind }: { kind: EvidenceKind }) {
  if (kind === "photo") return <ImageIcon className="h-4 w-4" />;
  if (kind === "video") return <VideoIcon className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

/**
 * Uploads evidence directly to Supabase Storage from the browser, then links
 * it to a real database record in evidence_files. RLS + the
 * validate_evidence_parent() trigger (see 0012_evidence_files.sql) verify the
 * entity actually belongs to the caller's organization before accepting it -
 * this component only proposes the upload, the database is what enforces it.
 */
export function EvidenceUploader({
  organizationId,
  entityType,
  entityId,
  readOnly = false,
}: {
  organizationId: string;
  entityType: "inspection" | "inspection_answer" | "finding" | "capa" | "asset";
  entityId: string;
  readOnly?: boolean;
}) {
  const supabase = createClient();
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("evidence_files")
      .select("id, file_name, file_path, kind")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("uploaded_at", { ascending: false });

    const rows = (data as EvidenceItem[]) ?? [];
    const withUrls = await Promise.all(
      rows.map(async (r) => {
        const { data: signed } = await supabase.storage.from("evidence").createSignedUrl(r.file_path, 3600);
        return { ...r, url: signed?.signedUrl };
      })
    );
    setItems(withUrls);
  }, [supabase, entityType, entityId]);

  useEffect(() => {
    // Standard "fetch on mount / when the target entity changes" effect -
    // load() sets state after its own await, not synchronously in the
    // effect body, so this is the documented data-fetching effect pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const path = `${organizationId}/${entityType}/${entityId}/${crypto.randomUUID()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from("evidence").upload(path, file, {
          upsert: false,
        });
        if (uploadError) {
          toast.error(`تعذر رفع ${file.name}: ${uploadError.message}`);
          continue;
        }
        const { error: insertError } = await supabase.from("evidence_files").insert({
          entity_type: entityType,
          entity_id: entityId,
          file_path: path,
          file_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          kind: kindFor(file),
        });
        if (insertError) toast.error(`تعذر ربط الملف: ${insertError.message}`);
      }
      toast.success("تم رفع الأدلة");
      await load();
    } finally {
      setUploading(false);
    }
  }

  async function remove(item: EvidenceItem) {
    await supabase.storage.from("evidence").remove([item.file_path]);
    await supabase.from("evidence_files").delete().eq("id", item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  return (
    <div className="flex flex-col gap-2">
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item.id} className="group relative">
              {item.kind === "photo" && item.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.file_name} className="h-20 w-20 rounded-lg border object-cover" />
              ) : (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border p-1 text-center hover:bg-muted"
                >
                  <IconFor kind={item.kind} />
                  <span className="line-clamp-2 text-[10px] text-muted-foreground">{item.file_name}</span>
                </a>
              )}
              {!readOnly && (
                <button
                  onClick={() => remove(item)}
                  className="absolute -end-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground group-hover:flex"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">
          {uploading ? <Upload className="h-3.5 w-3.5 animate-pulse" /> : <Paperclip className="h-3.5 w-3.5" />}
          {uploading ? "جارٍ الرفع..." : "إرفاق صورة / ملف"}
          <input
            type="file"
            multiple
            accept="image/*,video/*,application/pdf"
            className="hidden"
            disabled={uploading}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      )}
    </div>
  );
}
