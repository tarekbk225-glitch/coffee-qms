-- =============================================================================
-- 0011_assets.sql
-- Equipment / asset registry. Maintenance, calibration and QR-scan workflows
-- are future phases (see README) but the registry and its QR identity are
-- built now so those phases can attach cleanly.
-- =============================================================================

create type public.asset_status as enum ('active', 'inactive', 'under_maintenance', 'retired');
create type public.asset_criticality as enum ('low', 'medium', 'high', 'critical');

create table public.assets (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  site_id           uuid not null references public.sites (id) on delete cascade,
  area_id           uuid references public.areas (id) on delete set null,
  department_id     uuid references public.departments (id) on delete set null,
  asset_code        text not null,
  qr_code_token     uuid not null default gen_random_uuid(),
  name              text not null,
  name_ar           text,
  category          text not null default 'general',
  manufacturer      text,
  model             text,
  serial_number     text,
  installation_date date,
  status            public.asset_status not null default 'active',
  criticality       public.asset_criticality not null default 'medium',
  warranty_expiry   date,
  notes             text,
  created_by        uuid references public.profiles (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (organization_id, asset_code)
);

create unique index assets_qr_token_idx on public.assets (qr_code_token);
create index assets_org_site_idx on public.assets (organization_id, site_id, status);
create index assets_category_idx on public.assets (category);

create trigger assets_set_updated_at
  before update on public.assets
  for each row execute function public.set_updated_at();

create trigger assets_audit
  after insert or update or delete on public.assets
  for each row execute function public.log_audit();

alter table public.assets enable row level security;

create policy assets_select on public.assets
  for select using (app.has_site_access(organization_id, site_id));

create policy assets_insert on public.assets
  for insert with check (app.can(organization_id, site_id, 'asset.create'));

create policy assets_update on public.assets
  for update using (app.can(organization_id, site_id, 'asset.edit'))
  with check (app.can(organization_id, site_id, 'asset.edit'));
-- No DELETE policy: retire an asset via status = 'retired' instead of deleting it.
