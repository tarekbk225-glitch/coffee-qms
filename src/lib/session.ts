import { cookies } from "next/headers";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { PermissionSet } from "@/lib/permissions";

export interface OrgMembership {
  organizationId: string;
  organizationName: string;
  organizationNameAr: string | null;
  roleKey: string;
  roleName: string;
  roleNameAr: string;
  siteId: string | null; // null = unrestricted (every site in the org)
}

export interface SessionContext {
  userId: string;
  email: string;
  fullName: string;
  fullNameAr: string | null;
  memberships: OrgMembership[];
  activeOrgId: string | null;
  activeOrgName: string | null;
  activeOrgNameAr: string | null;
  /** null = the user's membership(s) for this org are unrestricted (all sites) */
  restrictedSiteIds: string[] | null;
  permissions: PermissionSet;
  roleNames: string[];
}

const ACTIVE_ORG_COOKIE = "active_org_id";

/**
 * Loads the current user's profile, org memberships and effective
 * permission set for the active organization. Cached per-request (React
 * `cache`) since almost every server component on a page needs this.
 *
 * This is a *rendering* convenience only - it decides what the UI shows.
 * The database's RLS policies and trigger-level checks are the actual
 * security boundary and are re-checked on every query regardless of what
 * this function returns.
 */
export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, full_name_ar")
    .eq("id", user.id)
    .maybeSingle();

  const { data: rows } = await supabase
    .from("memberships")
    .select(
      "organization_id, site_id, is_active, organizations(name, name_ar), roles(key, name, name_ar)"
    )
    .eq("user_id", user.id)
    .eq("is_active", true);

  type MembershipRow = {
    organization_id: string;
    site_id: string | null;
    organizations: { name: string; name_ar: string | null } | null;
    roles: { key: string; name: string; name_ar: string } | null;
  };

  const memberships: OrgMembership[] =
    (rows as unknown as MembershipRow[] | null)?.map((r) => ({
      organizationId: r.organization_id,
      organizationName: r.organizations?.name ?? "",
      organizationNameAr: r.organizations?.name_ar ?? null,
      roleKey: r.roles?.key ?? "",
      roleName: r.roles?.name ?? "",
      roleNameAr: r.roles?.name_ar ?? "",
      siteId: r.site_id,
    })) ?? [];

  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null;
  const activeOrgId =
    memberships.find((m) => m.organizationId === cookieOrgId)?.organizationId ??
    memberships[0]?.organizationId ??
    null;

  const orgMemberships = memberships.filter((m) => m.organizationId === activeOrgId);
  const hasUnrestricted = orgMemberships.some((m) => m.siteId === null);
  const restrictedSiteIds = hasUnrestricted
    ? null
    : orgMemberships.map((m) => m.siteId).filter((s): s is string => !!s);

  const permissionSet = new Set<string>();
  if (activeOrgId) {
    const { data: permRows } = await supabase
      .from("memberships")
      .select("roles(role_permissions(permission_key))")
      .eq("user_id", user.id)
      .eq("organization_id", activeOrgId)
      .eq("is_active", true);

    type PermRow = { roles: { role_permissions: { permission_key: string }[] } | null };
    (permRows as unknown as PermRow[] | null)?.forEach((r) => {
      r.roles?.role_permissions?.forEach((rp) => permissionSet.add(rp.permission_key));
    });
  }
  const permissions: PermissionSet = [...permissionSet];

  const active = memberships.find((m) => m.organizationId === activeOrgId);

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? "",
    fullName: profile?.full_name ?? "",
    fullNameAr: profile?.full_name_ar ?? null,
    memberships,
    activeOrgId,
    activeOrgName: active?.organizationName ?? null,
    activeOrgNameAr: active?.organizationNameAr ?? null,
    restrictedSiteIds,
    permissions,
    roleNames: [...new Set(orgMemberships.map((m) => m.roleNameAr))],
  };
});

export { ACTIVE_ORG_COOKIE };
