import type { ComponentProps } from "react";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { can, canAny, PERMISSIONS } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ShieldOff } from "lucide-react";
import { SettingsTabs } from "./settings-tabs";

export default async function SettingsPage() {
  const session = await getSessionContext();
  const orgId = session!.activeOrgId!;
  const canAccess = canAny(session!.permissions, [
    PERMISSIONS.ADMIN_ORG_MANAGE,
    PERMISSIONS.SITE_MANAGE,
    PERMISSIONS.ADMIN_USERS_MANAGE,
  ]);

  if (!canAccess) {
    return (
      <div>
        <PageHeader title="الإعدادات" description="بيانات المنظمة والمواقع والأقسام والمستخدمين" />
        <EmptyState
          icon={ShieldOff}
          title="لا تملك صلاحية الوصول إلى الإعدادات"
          description="تواصل مع مسؤول النظام إن كنت بحاجة إلى إدارة المواقع أو الأقسام أو المستخدمين."
        />
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: org }, { data: sites }, { data: departments }, { data: memberships }, { data: roles }] = await Promise.all([
    supabase.from("organizations").select("id, name, name_ar, slug").eq("id", orgId).maybeSingle(),
    supabase.from("sites").select("*").eq("organization_id", orgId).order("created_at"),
    supabase.from("departments").select("*, sites(name, name_ar)").eq("organization_id", orgId).order("created_at"),
    supabase
      .from("memberships")
      .select(
        "id, user_id, role_id, site_id, is_active, created_at, profiles(email, full_name, full_name_ar), roles(key, name, name_ar), sites(name, name_ar)"
      )
      .eq("organization_id", orgId)
      .order("created_at"),
    supabase.from("roles").select("id, key, name, name_ar").or(`organization_id.is.null,organization_id.eq.${orgId}`).order("name_ar"),
  ]);

  return (
    <div>
      <PageHeader title="الإعدادات" description="بيانات المنظمة والمواقع والأقسام والمستخدمين" />
      <SettingsTabs
        org={org ?? { id: orgId, name: "", name_ar: "", slug: "" }}
        sites={sites ?? []}
        departments={(departments ?? []) as unknown as ComponentProps<typeof SettingsTabs>["departments"]}
        memberships={(memberships ?? []) as unknown as ComponentProps<typeof SettingsTabs>["memberships"]}
        roles={roles ?? []}
        canManageOrg={can(session!.permissions, PERMISSIONS.ADMIN_ORG_MANAGE)}
        canManageSites={can(session!.permissions, PERMISSIONS.SITE_MANAGE)}
        canManageUsers={can(session!.permissions, PERMISSIONS.ADMIN_USERS_MANAGE)}
      />
    </div>
  );
}
