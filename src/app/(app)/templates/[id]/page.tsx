import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { can, PERMISSIONS } from "@/lib/permissions";
import { TemplateBuilder } from "./template-builder";

export default async function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionContext();
  const supabase = await createClient();

  const { data: template } = await supabase.from("templates").select("*").eq("id", id).maybeSingle();
  if (!template) notFound();

  const { data: sections } = await supabase
    .from("template_sections")
    .select("*")
    .eq("template_id", id)
    .order("sort_order");

  const { data: questions } = await supabase
    .from("template_questions")
    .select("*")
    .eq("template_id", id)
    .order("sort_order");

  const canEdit = can(session!.permissions, PERMISSIONS.TEMPLATE_CREATE);
  const canReview = can(session!.permissions, PERMISSIONS.TEMPLATE_REVIEW);
  const canPublish = can(session!.permissions, PERMISSIONS.TEMPLATE_PUBLISH);

  return (
    <TemplateBuilder
      template={template}
      sections={sections ?? []}
      questions={questions ?? []}
      orgId={session!.activeOrgId!}
      canEdit={canEdit}
      canReview={canReview}
      canPublish={canPublish}
    />
  );
}
