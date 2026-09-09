-- =============================================================================
-- 0003_core_org_structure.sql
-- Organization > Sites > Departments > Areas, plus Teams.
-- Every operational record in later migrations hangs off one of these scopes.
-- =============================================================================

create type public.site_type as enum ('factory', 'branch', 'warehouse', 'office');
create type public.area_type as enum ('production', 'warehouse', 'storage', 'utility', 'office', 'other');

-- -----------------------------------------------------------------------------
-- organizations
-- -----------------------------------------------------------------------------
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  name_ar     text,
  slug        citext not null unique,
  logo_url    text,
  is_active   boolean not null default true,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9-]{2,60}$')
);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- sites (factories / branches / warehouses)
-- -----------------------------------------------------------------------------
create table public.sites (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null,
  name_ar         text,
  code            text not null,
  type            public.site_type not null default 'factory',
  address         text,
  city            text,
  timezone        text not null default 'Asia/Riyadh',
  is_active       boolean not null default true,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, code)
);

create index sites_org_idx on public.sites (organization_id);

create trigger sites_set_updated_at
  before update on public.sites
  for each row execute function public.set_updated_at();

create trigger sites_audit
  after insert or update or delete on public.sites
  for each row execute function public.log_audit();

-- -----------------------------------------------------------------------------
-- departments
-- -----------------------------------------------------------------------------
create table public.departments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  site_id         uuid not null references public.sites (id) on delete cascade,
  name            text not null,
  name_ar         text,
  code            text,
  is_active       boolean not null default true,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (site_id, name)
);

create index departments_org_idx on public.departments (organization_id);
create index departments_site_idx on public.departments (site_id);

create trigger departments_set_updated_at
  before update on public.departments
  for each row execute function public.set_updated_at();

create trigger departments_audit
  after insert or update or delete on public.departments
  for each row execute function public.log_audit();

-- -----------------------------------------------------------------------------
-- areas (production areas, warehouses, storage rooms, ...)
-- -----------------------------------------------------------------------------
create table public.areas (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  site_id         uuid not null references public.sites (id) on delete cascade,
  department_id   uuid references public.departments (id) on delete set null,
  name            text not null,
  name_ar         text,
  type            public.area_type not null default 'production',
  qr_code_token   uuid not null default gen_random_uuid(),
  is_active       boolean not null default true,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (site_id, name)
);

create index areas_org_idx on public.areas (organization_id);
create index areas_site_idx on public.areas (site_id);
create unique index areas_qr_token_idx on public.areas (qr_code_token);

create trigger areas_set_updated_at
  before update on public.areas
  for each row execute function public.set_updated_at();

create trigger areas_audit
  after insert or update or delete on public.areas
  for each row execute function public.log_audit();

-- -----------------------------------------------------------------------------
-- teams
-- -----------------------------------------------------------------------------
create table public.teams (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  site_id         uuid references public.sites (id) on delete cascade,
  department_id   uuid references public.departments (id) on delete set null,
  name            text not null,
  name_ar         text,
  is_active       boolean not null default true,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index teams_org_idx on public.teams (organization_id);

create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

create trigger teams_audit
  after insert or update or delete on public.teams
  for each row execute function public.log_audit();

create table public.team_members (
  team_id    uuid not null references public.teams (id) on delete cascade,
  user_id    uuid not null,
  added_at   timestamptz not null default now(),
  primary key (team_id, user_id)
);
