import { notFound } from "next/navigation";
import type { ComponentProps } from "react";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { can, PERMISSIONS } from "@/lib/permissions";
import { CapaDetail } from "./capa-detail";

export default async function CapaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionContext();
  const supabase = await createClient();

  const { data: capa } = await supabase
    .from("capas")
    .select(
      "*, findings(id, finding_number, description), assignee:profiles!capas_assigned_to_fkey(id, full_name, full_name_ar)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!capa) notFound();

  const [{ data: fiveWhys }, { data: fishbone }, { data: members }] = await Promise.all([
    supabase.from("capa_five_whys").select("*").eq("capa_id", id).maybeSingle(),
    supabase.from("capa_fishbone_causes").select("*").eq("capa_id", id).order("created_at"),
    supabase
      .from("memberships")
      .select("user_id, profiles(full_name, full_name_ar)")
      .eq("organization_id", session!.activeOrgId!)
      .eq("is_active", true),
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
    <CapaDetail
      capa={capa as unknown as ComponentProps<typeof CapaDetail>["capa"]}
      fiveWhys={fiveWhys}
      fishbone={fishbone ?? []}
      members={members_}
      orgId={session!.activeOrgId!}
      currentUserId={session!.userId}
      canAssign={can(session!.permissions, PERMISSIONS.CAPA_ASSIGN)}
      canVerify={can(session!.permissions, PERMISSIONS.CAPA_VERIFY)}
      canApprove={can(session!.permissions, PERMISSIONS.CAPA_APPROVE)}
      canClose={can(session!.permissions, PERMISSIONS.CAPA_CLOSE)}
    />
  );
}
