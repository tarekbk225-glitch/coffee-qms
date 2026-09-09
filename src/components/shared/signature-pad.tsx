"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Eraser, Check } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function SignaturePad({
  organizationId,
  entityId,
  onSaved,
}: {
  organizationId: string;
  entityId: string;
  onSaved?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    const { x, y } = pos(e);
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1c1917";
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  }

  function end() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setSaving(false);
        return;
      }
      const path = `${organizationId}/inspection_answer/${entityId}/${crypto.randomUUID()}-signature.png`;
      const { error: uploadError } = await supabase.storage.from("evidence").upload(path, blob, { contentType: "image/png" });
      if (uploadError) {
        toast.error("تعذر حفظ التوقيع: " + uploadError.message);
        setSaving(false);
        return;
      }
      const { error: insertError } = await supabase.from("evidence_files").insert({
        entity_type: "inspection_answer",
        entity_id: entityId,
        file_path: path,
        file_name: "signature.png",
        mime_type: "image/png",
        kind: "signature",
      });
      setSaving(false);
      if (insertError) toast.error(insertError.message);
      else {
        toast.success("تم حفظ التوقيع");
        clear();
        onSaved?.();
      }
    }, "image/png");
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        width={320}
        height={120}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="touch-none rounded-lg border bg-white"
      />
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={clear}>
          <Eraser className="h-3.5 w-3.5" /> مسح
        </Button>
        <Button type="button" size="sm" disabled={!hasDrawn || saving} onClick={save}>
          <Check className="h-3.5 w-3.5" /> {saving ? "جارٍ الحفظ..." : "حفظ التوقيع"}
        </Button>
      </div>
    </div>
  );
}
