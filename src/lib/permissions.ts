// Mirrors the `key` column of public.permissions (see
// supabase/migrations/0004_users_roles_permissions.sql). Kept as a typed
// constant so the UI never hard-codes a permission string with a typo.
export const PERMISSIONS = {
  ADMIN_ORG_MANAGE: "admin.org.manage",
  ADMIN_USERS_MANAGE: "admin.users.manage",
  ADMIN_ROLES_MANAGE: "admin.roles.manage",
  SITE_MANAGE: "site.manage",
  TEMPLATE_CREATE: "template.create",
  TEMPLATE_REVIEW: "template.review",
  TEMPLATE_PUBLISH: "template.publish",
  INSPECTION_SCHEDULE: "inspection.schedule",
  INSPECTION_CREATE: "inspection.create",
  INSPECTION_EXECUTE: "inspection.execute",
  INSPECTION_REVIEW: "inspection.review",
  INSPECTION_APPROVE: "inspection.approve",
  FINDING_MANAGE: "finding.manage",
  FINDING_CLOSE: "finding.close",
  CAPA_CREATE: "capa.create",
  CAPA_ASSIGN: "capa.assign",
  CAPA_VERIFY: "capa.verify",
  CAPA_APPROVE: "capa.approve",
  CAPA_CLOSE: "capa.close",
  ASSET_CREATE: "asset.create",
  ASSET_EDIT: "asset.edit",
  REPORT_VIEW: "report.view",
  REPORT_VIEW_ORG: "report.view.org",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Plain string array (not a Set) so it survives the Server -> Client
// Component serialization boundary without any special-casing.
export type PermissionSet = string[];

export function can(perms: PermissionSet, key: PermissionKey): boolean {
  return perms.includes(key);
}

export function canAny(perms: PermissionSet, keys: PermissionKey[]): boolean {
  return keys.some((k) => perms.includes(k));
}
