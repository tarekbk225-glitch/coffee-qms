import { notFound } from "next/navigation";
import type { ComponentProps } from "react";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { can, PERMISSIONS } from "@/lib/permissions";
import { InspectionWorkspace } from "./inspection-workspace";

export default async function InspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionContext();
  const supabase = await createClient();

  const { data: inspection } = await supabase
    .from("inspections")
    .select(
      "*, templates(id, name, name_ar), sites(name_ar, name), departments(name_ar, name), areas(name_ar, name), inspector:profiles!inspections_inspector_id_fkey(id, full_name, full_name_ar)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!inspection) notFound();

  const [{ data: sections }, { data: questions }, { data: answers }, { data: findings }] = await Promise.all([
    supabase.from("template_sections").select("*").eq("template_id", inspection.template_id).order("sort_order"),
    supabase.from("template_questions").select("*").eq("template_id", inspection.template_id).order("sort_order"),
    supabase.from("inspection_answers").select("*").eq("inspection_id", id),
    supabase.from("findings").select("id, finding_number, severity, status, description").eq("inspection_id", id),
  ]);

  const isInspector = (inspection.inspector as unknown as { id: string } | null)?.id === session!.userId;
  const canRunAsAdmin = can(session!.permissions, PERMISSIONS.INSPECTION_SCHEDULE);
  const canReview = can(session!.permissions, PERMISSIONS.INSPECTION_REVIEW);
  const canApprove = can(session!.permissions, PERMISSIONS.INSPECTION_APPROVE);
  const canExecute = (isInspector || canRunAsAdmin) && ["scheduled", "in_progress"].includes(inspection.status);

  return (
    <InspectionWorkspace
      inspection={inspection as unknown as ComponentProps<typeof InspectionWorkspace>["inspection"]}
      sections={sections ?? []}
      questions={questions ?? []}
      answers={answers ?? []}
      findings={findings ?? []}
      orgId={session!.activeOrgId!}
      canExecute={canExecute}
      canReview={canReview}
      canApprove={canApprove}
      canReschedule={canRunAsAdmin}
    />
  );
}
