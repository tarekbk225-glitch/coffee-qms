-- =============================================================================
-- 0004_users_roles_permissions.sql
-- Profiles (mirrors auth.users), extensible permission model, system roles,
-- role/permission mapping, and organization membership.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles: one row per auth.users row, created automatically on sign-up.
-- -----------------------------------------------------------------------------
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           citext not null,
  full_name       text not null default '',
  full_name_ar    text,
  phone           text,
  avatar_url      text,
  is_active       boolean not null default true,
  locale          text not null default 'ar',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- auth.users lives in Supabase's own `auth` schema, not `public` - so unlike
-- everything else in this project, a `drop schema public cascade` reset
-- won't clear this trigger out. Drop-if-exists first so this file is safely
-- re-runnable on its own.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- permissions: static, extensible catalogue. New permission keys can be added
-- with a simple INSERT in a future migration - nothing else needs to change.
-- -----------------------------------------------------------------------------
create table public.permissions (
  key         text primary key,
  category    text not null,
  description text not null
);

insert into public.permissions (key, category, description) values
  ('admin.org.manage',        'admin',       'Manage organization settings'),
  ('admin.users.manage',      'admin',       'Manage users, memberships and role assignments'),
  ('admin.roles.manage',      'admin',       'Manage custom roles and permission mapping'),
  ('site.manage',             'admin',       'Create/edit sites, departments, areas, teams'),
  ('template.create',         'template',    'Create and edit checklist templates'),
  ('template.review',         'template',    'Move templates to Under Review / Approved'),
  ('template.publish',        'template',    'Publish or archive templates'),
  ('inspection.schedule',     'inspection',  'Schedule/create inspections'),
  ('inspection.create',       'inspection',  'Create ad-hoc inspections'),
  ('inspection.execute',      'inspection',  'Run/answer an assigned inspection'),
  ('inspection.review',       'inspection',  'Review submitted inspections'),
  ('inspection.approve',      'inspection',  'Approve or reject reviewed inspections'),
  ('finding.manage',          'finding',     'Update finding status, severity, root cause'),
  ('finding.close',           'finding',     'Close or reject a finding'),
  ('capa.create',             'capa',        'Open new CAPAs'),
  ('capa.assign',             'capa',        'Assign/re-assign CAPAs and set due dates'),
  ('capa.verify',             'capa',        'Verify completed CAPA actions'),
  ('capa.approve',            'capa',        'Approve verified CAPAs'),
  ('capa.close',              'capa',        'Close CAPAs'),
  ('asset.create',            'asset',       'Register new assets/equipment'),
  ('asset.edit',              'asset',       'Edit or retire assets'),
  ('report.view',             'report',      'View dashboards and reports'),
  ('report.view.org',         'report',      'View dashboards/reports across all sites in the organization')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- roles: system roles (shared, organization_id null) plus room for future
-- organization-specific custom roles.
-- -----------------------------------------------------------------------------
create table public.roles (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  key             text not null,
  name            text not null,
  name_ar         text not null,
  is_system       boolean not null default false,
  description     text,
  created_at      timestamptz not null default now(),
  unique (organization_id, key)
);

-- System roles share a single NULL-organization row per key, referenced by
-- every organization's memberships. A partial unique index enforces one row
-- per key among system roles specifically.
create unique index roles_system_key_idx on public.roles (key) where organization_id is null;

insert into public.roles (key, name, name_ar, is_system, description) values
  ('super_admin',         'Super Admin',            'مدير عام النظام',          true, 'Full access across the organization'),
  ('factory_admin',       'Factory Admin',          'مدير المصنع',              true, 'Administers a site: users, structure, templates'),
  ('quality_manager',     'Quality Manager',        'مدير الجودة',              true, 'Owns quality workflow: templates, review, CAPA'),
  ('quality_inspector',   'Quality Inspector',      'مفتش الجودة',              true, 'Executes inspections and raises findings'),
  ('production_manager',  'Production Manager',     'مدير الإنتاج',             true, 'Reviews production quality, assigns CAPAs'),
  ('production_supervisor','Production Supervisor', 'مشرف الإنتاج',             true, 'Executes production checklists'),
  ('warehouse_manager',   'Warehouse Manager',      'مدير المستودع',            true, 'Warehouse inspections and CAPAs'),
  ('maintenance_manager', 'Maintenance Manager',    'مدير الصيانة',             true, 'Owns assets and maintenance'),
  ('technician',          'Technician',             'فني',                      true, 'Executes assigned corrective/maintenance actions'),
  ('employee',            'Employee',               'موظف',                     true, 'Runs assigned checklists and tasks'),
  ('viewer_auditor',      'Viewer / Auditor',       'مشاهد / مدقق',             true, 'Read-only access to records and reports')
on conflict do nothing;

create table public.role_permissions (
  role_id         uuid not null references public.roles (id) on delete cascade,
  permission_key  text not null references public.permissions (key) on delete cascade,
  primary key (role_id, permission_key)
);

-- Grant ALL permissions to super_admin.
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r cross join public.permissions p
where r.key = 'super_admin'
on conflict do nothing;

-- factory_admin: everything except organization-level teardown.
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r cross join public.permissions p
where r.key = 'factory_admin' and p.key <> 'admin.org.manage'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, unnest(array[
  'template.create','template.review','template.publish',
  'inspection.schedule','inspection.create','inspection.review','inspection.approve',
  'finding.manage','finding.close',
  'capa.create','capa.assign','capa.verify','capa.approve','capa.close',
  'report.view','report.view.org'
]) from public.roles r where r.key = 'quality_manager'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, unnest(array[
  'inspection.create','inspection.execute','capa.create','report.view'
]) from public.roles r where r.key = 'quality_inspector'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, unnest(array[
  'inspection.review','capa.create','capa.assign','report.view','report.view.org'
]) from public.roles r where r.key = 'production_manager'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, unnest(array[
  'inspection.execute','inspection.create','capa.create','report.view'
]) from public.roles r where r.key = 'production_supervisor'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, unnest(array[
  'inspection.execute','inspection.create','capa.create','report.view'
]) from public.roles r where r.key = 'warehouse_manager'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, unnest(array[
  'asset.create','asset.edit','capa.create','capa.assign','report.view'
]) from public.roles r where r.key = 'maintenance_manager'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, unnest(array['inspection.execute','report.view'])
from public.roles r where r.key = 'technician'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, unnest(array['inspection.execute'])
from public.roles r where r.key = 'employee'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, unnest(array['report.view','report.view.org'])
from public.roles r where r.key = 'viewer_auditor'
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- memberships: which organization(s) a user belongs to, with which role, and
-- an optional site restriction (null = every site in the organization).
-- -----------------------------------------------------------------------------
create table public.memberships (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  role_id         uuid not null references public.roles (id),
  site_id         uuid references public.sites (id) on delete set null,
  department_id   uuid references public.departments (id) on delete set null,
  is_active       boolean not null default true,
  invited_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, user_id, site_id)
);

create index memberships_user_idx on public.memberships (user_id);
create index memberships_org_idx on public.memberships (organization_id);

create trigger memberships_set_updated_at
  before update on public.memberships
  for each row execute function public.set_updated_at();

create trigger memberships_audit
  after insert or update or delete on public.memberships
  for each row execute function public.log_audit();

-- -----------------------------------------------------------------------------
-- Bootstrap RPC: atomically create an organization + first site + the calling
-- user's Super Admin membership. Runs as SECURITY DEFINER because at the
-- moment of creation the caller has no membership yet to satisfy RLS.
-- -----------------------------------------------------------------------------
create or replace function public.create_organization(
  p_name text,
  p_name_ar text,
  p_slug text,
  p_site_name text default 'الموقع الرئيسي'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id  uuid;
  v_site_id uuid;
  v_role_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.organizations (name, name_ar, slug, created_by)
  values (p_name, p_name_ar, p_slug, auth.uid())
  returning id into v_org_id;

  insert into public.sites (organization_id, name, code, created_by)
  values (v_org_id, p_site_name, 'MAIN', auth.uid())
  returning id into v_site_id;

  select id into v_role_id from public.roles where key = 'super_admin';

  insert into public.memberships (organization_id, user_id, role_id, site_id)
  values (v_org_id, auth.uid(), v_role_id, null);

  return v_org_id;
end;
$$;

comment on function public.create_organization is
  'SECURITY DEFINER bootstrap RPC. Creates an organization, its first site, and grants the calling user Super Admin membership in one transaction.';
