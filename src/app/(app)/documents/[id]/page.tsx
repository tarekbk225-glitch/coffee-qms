import { notFound } from "next/navigation";
import type { ComponentProps } from "react";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { can, PERMISSIONS } from "@/lib/permissions";
import { DocumentDetail } from "./document-detail";

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionContext();
  const supabase = await createClient();

  const { data: document } = await supabase
    .from("documents")
    .select(
      "*, department:departments(id, name, name_ar), owner:profiles!documents_owner_id_fkey(id, full_name, full_name_ar), approver:profiles!documents_approved_by_fkey(id, full_name, full_name_ar)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!document) notFound();

  const [{ data: departments }, { data: versions }] = await Promise.all([
    supabase.from("departments").select("id, name, name_ar").eq("organization_id", session!.activeOrgId!).order("name_ar"),
    supabase
      .from("documents")
      .select("id, version, status, created_at, approved_at")
      .eq("organization_id", session!.activeOrgId!)
      .eq("document_number", document.document_number)
      .order("version", { ascending: false }),
  ]);

  return (
    <DocumentDetail
      document={document as unknown as ComponentProps<typeof DocumentDetail>["document"]}
      departments={departments ?? []}
      versions={versions ?? []}
      orgId={session!.activeOrgId!}
      canManage={can(session!.permissions, PERMISSIONS.DOCUMENT_MANAGE)}
    />
  );
}
