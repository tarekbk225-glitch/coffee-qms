-- =============================================================================
-- 0006_rls_core.sql
-- Enable RLS and add policies for organization structure, users, roles and
-- permissions. No table below grants INSERT/UPDATE/DELETE to a normal user
-- unless a matching policy explicitly says so - everything else is denied
-- by default once RLS is enabled, per Postgres semantics.
-- =============================================================================

alter table public.organizations  enable row level security;
alter table public.sites          enable row level security;
alter table public.departments    enable row level security;
alter table public.areas          enable row level security;
alter table public.teams          enable row level security;
alter table public.team_members   enable row level security;
alter table public.profiles       enable row level security;
alter table public.roles          enable row level security;
alter table public.permissions    enable row level security;
alter table public.role_permissions enable row level security;
alter table public.memberships    enable row level security;
alter table public.audit_log      enable row level security;

-- ---------------------------------------------------------------- organizations
create policy organizations_select on public.organizations
  for select using (app.is_org_member(id));

create policy organizations_update on public.organizations
  for update using (app.can(id, null, 'admin.org.manage'))
  with check (app.can(id, null, 'admin.org.manage'));
-- No INSERT/DELETE policy: organizations are only created via the
-- public.create_organization() SECURITY DEFINER RPC.

-- ---------------------------------------------------------------- sites
create policy sites_select on public.sites
  for select using (app.has_site_access(organization_id, id));

create policy sites_insert on public.sites
  for insert with check (app.can(organization_id, null, 'site.manage'));

create policy sites_update on public.sites
  for update using (app.can(organization_id, id, 'site.manage'))
  with check (app.can(organization_id, id, 'site.manage'));

create policy sites_delete on public.sites
  for delete using (app.can(organization_id, id, 'site.manage'));

-- ---------------------------------------------------------------- departments
create policy departments_select on public.departments
  for select using (app.has_site_access(organization_id, site_id));

create policy departments_insert on public.departments
  for insert with check (app.can(organization_id, site_id, 'site.manage'));

create policy departments_update on public.departments
  for update using (app.can(organization_id, site_id, 'site.manage'))
  with check (app.can(organization_id, site_id, 'site.manage'));

create policy departments_delete on public.departments
  for delete using (app.can(organization_id, site_id, 'site.manage'));

-- ---------------------------------------------------------------- areas
create policy areas_select on public.areas
  for select using (app.has_site_access(organization_id, site_id));

create policy areas_insert on public.areas
  for insert with check (app.can(organization_id, site_id, 'site.manage'));

create policy areas_update on public.areas
  for update using (app.can(organization_id, site_id, 'site.manage'))
  with check (app.can(organization_id, site_id, 'site.manage'));

create policy areas_delete on public.areas
  for delete using (app.can(organization_id, site_id, 'site.manage'));

-- ---------------------------------------------------------------- teams
create policy teams_select on public.teams
  for select using (app.has_site_access(organization_id, site_id));

create policy teams_insert on public.teams
  for insert with check (app.can(organization_id, site_id, 'site.manage'));

create policy teams_update on public.teams
  for update using (app.can(organization_id, site_id, 'site.manage'))
  with check (app.can(organization_id, site_id, 'site.manage'));

create policy teams_delete on public.teams
  for delete using (app.can(organization_id, site_id, 'site.manage'));

create policy team_members_select on public.team_members
  for select using (
    exists (select 1 from public.teams t where t.id = team_id and app.has_site_access(t.organization_id, t.site_id))
  );

create policy team_members_write on public.team_members
  for all using (
    exists (select 1 from public.teams t where t.id = team_id and app.can(t.organization_id, t.site_id, 'site.manage'))
  ) with check (
    exists (select 1 from public.teams t where t.id = team_id and app.can(t.organization_id, t.site_id, 'site.manage'))
  );

-- ---------------------------------------------------------------- profiles
-- Visible to yourself, and to anyone who shares at least one organization.
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1 from public.memberships mine
      join public.memberships theirs on theirs.organization_id = mine.organization_id
      where mine.user_id = auth.uid() and mine.is_active
        and theirs.user_id = public.profiles.id and theirs.is_active
    )
  );

create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_update_admin on public.profiles
  for update using (
    exists (
      select 1 from public.memberships theirs
      where theirs.user_id = public.profiles.id and theirs.is_active
        and app.can(theirs.organization_id, null, 'admin.users.manage')
    )
  );

-- ---------------------------------------------------------------- roles / permissions (read-only reference data)
create policy roles_select on public.roles
  for select using (organization_id is null or app.is_org_member(organization_id));

create policy permissions_select on public.permissions
  for select using (auth.role() = 'authenticated');

create policy role_permissions_select on public.role_permissions
  for select using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------- memberships
create policy memberships_select on public.memberships
  for select using (app.is_org_member(organization_id));

create policy memberships_insert on public.memberships
  for insert with check (app.can(organization_id, site_id, 'admin.users.manage'));

create policy memberships_update on public.memberships
  for update using (app.can(organization_id, site_id, 'admin.users.manage'))
  with check (app.can(organization_id, site_id, 'admin.users.manage'));

create policy memberships_delete on public.memberships
  for delete using (app.can(organization_id, site_id, 'admin.users.manage'));

-- ---------------------------------------------------------------- audit_log
-- Read-only for anyone who can view reports for the organization/site.
-- No INSERT/UPDATE/DELETE policy exists: rows are written exclusively by the
-- SECURITY DEFINER public.log_audit() trigger function.
create policy audit_log_select on public.audit_log
  for select using (app.can(organization_id, null, 'report.view') or app.can(organization_id, null, 'report.view.org'));
