-- =============================================================================
-- 0005_rls_helpers.sql
-- Central authorization helpers used by every RLS policy in the project.
-- Keeping this logic in one place means permission rules are enforced
-- consistently in the database itself, not just hidden/shown in the UI.
-- =============================================================================

create schema if not exists app;

-- Is the current user an active member of this organization at all
-- (regardless of permission or site)?
create or replace function app.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = p_org_id
      and m.user_id = auth.uid()
      and m.is_active
  );
$$;

-- Does the current user's membership in this organization cover this site?
-- A membership with site_id = NULL is unrestricted (every site).
create or replace function app.has_site_access(p_org_id uuid, p_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = p_org_id
      and m.user_id = auth.uid()
      and m.is_active
      and (p_site_id is null or m.site_id is null or m.site_id = p_site_id)
  );
$$;

-- The workhorse: does the current user hold `p_perm` in this organization,
-- with a membership row that also covers p_site_id (pass NULL for org-wide
-- resources that are not tied to a single site)?
create or replace function app.can(p_org_id uuid, p_site_id uuid, p_perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    join public.role_permissions rp on rp.role_id = m.role_id
    where m.organization_id = p_org_id
      and m.user_id = auth.uid()
      and m.is_active
      and rp.permission_key = p_perm
      and (p_site_id is null or m.site_id is null or m.site_id = p_site_id)
  );
$$;

comment on function app.can(uuid, uuid, text) is
  'True if the current user (auth.uid()) has an active membership in p_org_id, that membership grants p_perm, and the membership''s site restriction (if any) covers p_site_id.';
