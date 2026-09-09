import { notFound } from "next/navigation";
import type { ComponentProps } from "react";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { can, PERMISSIONS } from "@/lib/permissions";
import { AssetDetail } from "./asset-detail";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionContext();
  const supabase = await createClient();

  const { data: asset } = await supabase
    .from("assets")
    .select("*, site:sites(id, name, name_ar), area:areas(id, name, name_ar), department:departments(id, name, name_ar)")
    .eq("id", id)
    .maybeSingle();

  if (!asset) notFound();

  const [{ data: departments }, { data: areas }] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name, name_ar, site_id")
      .eq("organization_id", session!.activeOrgId!)
      .eq("site_id", asset.site_id)
      .order("name_ar"),
    supabase
      .from("areas")
      .select("id, name, name_ar, site_id")
      .eq("organization_id", session!.activeOrgId!)
      .eq("site_id", asset.site_id)
      .order("name_ar"),
  ]);

  return (
    <AssetDetail
      asset={asset as unknown as ComponentProps<typeof AssetDetail>["asset"]}
      departments={departments ?? []}
      areas={areas ?? []}
      orgId={session!.activeOrgId!}
      canEdit={can(session!.permissions, PERMISSIONS.ASSET_EDIT)}
    />
  );
}
