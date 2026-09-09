-- =============================================================================
-- 0014_memberships_unique_fix.sql
--
-- Bug found while validating supabase/seed.sql end-to-end: the original
-- `unique (organization_id, user_id, site_id)` constraint on memberships
-- (0004_users_roles_permissions.sql) does NOT prevent duplicate ORG-WIDE
-- memberships, because Postgres unique constraints never treat two NULLs as
-- equal - and site_id is null precisely for an "unrestricted, every site in
-- the org" membership (see app.has_site_access()). Re-running any insert
-- path twice for the same user with site_id null (the seed script, or the
-- Settings "add member" flow) silently created a second row instead of
-- being rejected/upserted.
--
-- Fixes it with a unique index that folds a null site_id into a single
-- sentinel value, so "user X in org Y, unrestricted" can only ever exist
-- once - while still allowing the same user to separately hold one
-- site-scoped membership per distinct site in that org.
-- =============================================================================

alter table public.memberships
  drop constraint memberships_organization_id_user_id_site_id_key;

create unique index memberships_org_user_site_uidx
  on public.memberships (organization_id, user_id, coalesce(site_id, '00000000-0000-0000-0000-000000000000'::uuid));

comment on index public.memberships_org_user_site_uidx is
  'Replaces the old plain UNIQUE(organization_id, user_id, site_id) constraint, which never blocked duplicate org-wide (site_id is null) memberships because NULL <> NULL in a unique constraint. Coalescing site_id to a sentinel UUID makes a null site_id compare equal to itself.';
