import { notFound } from "next/navigation";
import type { ComponentProps } from "react";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { can, PERMISSIONS } from "@/lib/permissions";
import { FindingDetail } from "./finding-detail";

export default async function FindingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionContext();
  const supabase = await createClient();

  const { data: finding } = await supabase
    .from("findings")
    .select(
      "*, departments(name_ar, name), sites(name_ar, name), inspections(id), assignee:profiles!findings_assigned_to_fkey(id, full_name, full_name_ar)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!finding) notFound();

  const [{ data: capas }, { data: members }] = await Promise.all([
    supabase.from("capas").select("id, capa_number, status, required_action, priority, due_date, assigned_to").eq("finding_id", id),
    supabase.from("memberships").select("user_id, profiles(full_name, full_name_ar)").eq("organization_id", session!.activeOrgId!).eq("is_active", true),
  ]);

  const members_ = (members ?? [])
    .map((m) => ({
      id: m.user_id,
      name:
        (m.profiles as unknown as { full_name: string; full_name_ar: string | null } | null)?.full_name_ar ||
        (m.profiles as unknown as { full_name: string } | null)?.full_name ||
        "—",
    }))
    .filter((v, i, arr) => arr.findIndex((x) => x.id === v.id) === i);

  return (
    <FindingDetail
      finding={finding as unknown as ComponentProps<typeof FindingDetail>["finding"]}
      capas={capas ?? []}
      members={members_}
      orgId={session!.activeOrgId!}
      canManage={can(session!.permissions, PERMISSIONS.FINDING_MANAGE)}
      canClose={can(session!.permissions, PERMISSIONS.FINDING_CLOSE)}
      canCreateCapa={can(session!.permissions, PERMISSIONS.CAPA_CREATE)}
      currentUserId={session!.userId}
    />
  );
}
