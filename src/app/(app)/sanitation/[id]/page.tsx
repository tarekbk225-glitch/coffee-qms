import { notFound } from "next/navigation";
import type { ComponentProps } from "react";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { can, PERMISSIONS } from "@/lib/permissions";
import { StationDetail } from "./station-detail";

export default async function StationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionContext();
  const supabase = await createClient();

  const { data: station } = await supabase
    .from("sanitation_stations")
    .select("*, site:sites(id, name, name_ar), area:areas(id, name, name_ar), department:departments(id, name, name_ar)")
    .eq("id", id)
    .maybeSingle();

  if (!station) notFound();

  const [{ data: departments }, { data: areas }, { data: checks }] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name, name_ar, site_id")
      .eq("organization_id", session!.activeOrgId!)
      .eq("site_id", station.site_id)
      .order("name_ar"),
    supabase
      .from("areas")
      .select("id, name, name_ar, site_id")
      .eq("organization_id", session!.activeOrgId!)
      .eq("site_id", station.site_id)
      .order("name_ar"),
    supabase
      .from("sanitation_checks")
      .select("id, check_number, checked_at, activity_level, pest_type_observed, cleanliness_status, corrective_action, notes, checker:profiles(full_name, full_name_ar)")
      .eq("station_id", id)
      .order("checked_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <StationDetail
      station={station as unknown as ComponentProps<typeof StationDetail>["station"]}
      departments={departments ?? []}
      areas={areas ?? []}
      checks={(checks ?? []) as unknown as ComponentProps<typeof StationDetail>["checks"]}
      orgId={session!.activeOrgId!}
      canManage={can(session!.permissions, PERMISSIONS.PEST_CONTROL_MANAGE)}
      canExecute={can(session!.permissions, PERMISSIONS.PEST_CONTROL_EXECUTE)}
    />
  );
}
