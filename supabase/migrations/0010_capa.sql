-- =============================================================================
-- 0010_capa.sql
-- Corrective / Preventive Actions, with structured 5-Whys and Fishbone root
-- cause analysis (not just free-text).
-- =============================================================================

create type public.capa_action_type as enum ('corrective', 'preventive');
create type public.capa_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.capa_status as enum (
  'open', 'assigned', 'in_progress', 'submitted', 'verification', 'approved', 'closed', 'rejected'
);
create type public.fishbone_category as enum (
  'man', 'machine', 'method', 'material', 'measurement', 'environment'
);

create table public.capas (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations (id) on delete cascade,
  site_id            uuid not null references public.sites (id) on delete cascade,
  finding_id         uuid references public.findings (id) on delete set null,
  capa_number        text not null,
  problem_description text not null,
  root_cause         text,
  action_type        public.capa_action_type not null default 'corrective',
  required_action    text not null,
  assigned_to        uuid references public.profiles (id),
  owner_id           uuid references public.profiles (id),
  priority           public.capa_priority not null default 'medium',
  due_date           date,
  status             public.capa_status not null default 'open',
  completion_notes   text,
  completed_at       timestamptz,
  verifier_id        uuid references public.profiles (id),
  verification_notes text,
  verified_at        timestamptz,
  approved_by        uuid references public.profiles (id),
  approved_at        timestamptz,
  closed_at          timestamptz,
  rejected_reason    text,
  created_by         uuid references public.profiles (id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (organization_id, capa_number)
);

create index capas_org_site_idx on public.capas (organization_id, site_id, status);
create index capas_assigned_idx on public.capas (assigned_to);
create index capas_finding_idx on public.capas (finding_id);
create index capas_due_date_idx on public.capas (due_date) where status not in ('closed', 'rejected');

create trigger capas_set_updated_at
  before update on public.capas
  for each row execute function public.set_updated_at();

create trigger capas_audit
  after insert or update or delete on public.capas
  for each row execute function public.log_audit();

create or replace function public.capas_assign_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.capa_number is null then
    new.capa_number := 'CAPA-' || to_char(now(), 'YYYY') || '-' || lpad(public.next_counter(new.organization_id, 'capa')::text, 5, '0');
  end if;
  return new;
end;
$$;

create trigger capas_assign_number_trg
  before insert on public.capas
  for each row execute function public.capas_assign_number();

-- ---------------------------------------------------------------- 5 Whys (structured, not one blob)
create table public.capa_five_whys (
  capa_id           uuid primary key references public.capas (id) on delete cascade,
  why_1             text,
  why_2             text,
  why_3             text,
  why_4             text,
  why_5             text,
  final_root_cause  text,
  created_by        uuid references public.profiles (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger capa_five_whys_set_updated_at
  before update on public.capa_five_whys
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- Fishbone causes
create table public.capa_fishbone_causes (
  id          uuid primary key default gen_random_uuid(),
  capa_id     uuid not null references public.capas (id) on delete cascade,
  category    public.fishbone_category not null,
  cause_text  text not null,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now()
);

create index capa_fishbone_causes_capa_idx on public.capa_fishbone_causes (capa_id);

-- ---------------------------------------------------------------- status workflow
create or replace function public.capas_validate_transition()
returns trigger
language plpgsql
as $$
declare
  v_is_assignee boolean := (new.assigned_to = auth.uid());
  v_can_assign  boolean := app.can(new.organization_id, new.site_id, 'capa.assign');
  v_can_verify  boolean := app.can(new.organization_id, new.site_id, 'capa.verify');
  v_can_approve boolean := app.can(new.organization_id, new.site_id, 'capa.approve');
  v_can_close   boolean := app.can(new.organization_id, new.site_id, 'capa.close');
begin
  if tg_op = 'UPDATE' and new.status <> old.status then
    if not (
      (old.status = 'open'         and new.status in ('assigned')) or
      (old.status = 'assigned'     and new.status in ('in_progress')) or
      (old.status = 'in_progress'  and new.status in ('submitted')) or
      (old.status = 'submitted'    and new.status in ('verification', 'in_progress')) or
      (old.status = 'verification' and new.status in ('approved', 'rejected')) or
      (old.status = 'rejected'     and new.status in ('in_progress')) or
      (old.status = 'approved'     and new.status in ('closed'))
    ) then
      raise exception 'Illegal CAPA status transition: % -> %', old.status, new.status;
    end if;

    -- Row-level RLS (assigned_to = auth.uid() OR any capa.* permission) only
    -- proves the caller may touch THIS row at all. It does not know which
    -- workflow step is being attempted, so the specific actor allowed to
    -- perform *this* transition is enforced here, in the trigger.
    if new.status = 'assigned' and not v_can_assign then
      raise exception 'Not authorized: assigning a CAPA requires capa.assign';
    elsif new.status = 'in_progress' and old.status = 'assigned' and not (v_is_assignee or v_can_assign) then
      raise exception 'Not authorized: only the assignee (or capa.assign) can start work on a CAPA';
    elsif new.status = 'submitted' and not (v_is_assignee or v_can_assign) then
      raise exception 'Not authorized: only the assignee (or capa.assign) can submit a CAPA for verification';
    elsif new.status = 'verification' and not v_can_verify then
      raise exception 'Not authorized: moving a CAPA into verification requires capa.verify';
    elsif new.status = 'in_progress' and old.status = 'submitted' and not (v_can_verify or v_can_assign) then
      raise exception 'Not authorized: sending a CAPA back to in-progress requires capa.verify or capa.assign';
    elsif new.status = 'approved' and not v_can_approve then
      raise exception 'Not authorized: approving a CAPA requires capa.approve';
    elsif new.status = 'rejected' and not (v_can_verify or v_can_approve) then
      raise exception 'Not authorized: rejecting a CAPA at verification requires capa.verify or capa.approve';
    elsif new.status = 'in_progress' and old.status = 'rejected' and not (v_is_assignee or v_can_assign) then
      raise exception 'Not authorized: only the assignee (or capa.assign) can rework a rejected CAPA';
    elsif new.status = 'closed' and not v_can_close then
      raise exception 'Not authorized: closing a CAPA requires capa.close';
    end if;

    if new.status = 'submitted' then
      new.completed_at := now();
      if new.completion_notes is null then
        raise exception 'completion_notes is required before submitting a CAPA for verification';
      end if;
    elsif new.status = 'approved' then
      new.verified_at := coalesce(new.verified_at, now());
      new.approved_at := now();
      new.approved_by := coalesce(new.approved_by, auth.uid());
    elsif new.status = 'rejected' then
      new.verified_at := coalesce(new.verified_at, now());
      if new.rejected_reason is null then
        raise exception 'rejected_reason is required when rejecting a CAPA at verification';
      end if;
    elsif new.status = 'closed' then
      new.closed_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger capas_status_transition
  before update on public.capas
  for each row execute function public.capas_validate_transition();

-- ---------------------------------------------------------------- RLS
alter table public.capas enable row level security;
alter table public.capa_five_whys enable row level security;
alter table public.capa_fishbone_causes enable row level security;

create policy capas_select on public.capas
  for select using (app.has_site_access(organization_id, site_id));

create policy capas_insert on public.capas
  for insert with check (app.can(organization_id, site_id, 'capa.create'));

create policy capas_update on public.capas
  for update using (
    assigned_to = auth.uid()
    or app.can(organization_id, site_id, 'capa.assign')
    or app.can(organization_id, site_id, 'capa.verify')
    or app.can(organization_id, site_id, 'capa.approve')
    or app.can(organization_id, site_id, 'capa.close')
  ) with check (
    assigned_to = auth.uid()
    or app.can(organization_id, site_id, 'capa.assign')
    or app.can(organization_id, site_id, 'capa.verify')
    or app.can(organization_id, site_id, 'capa.approve')
    or app.can(organization_id, site_id, 'capa.close')
  );

create policy capa_five_whys_select on public.capa_five_whys
  for select using (
    exists (select 1 from public.capas c where c.id = capa_id and app.has_site_access(c.organization_id, c.site_id))
  );

create policy capa_five_whys_write on public.capa_five_whys
  for all using (
    exists (
      select 1 from public.capas c where c.id = capa_id
      and (c.assigned_to = auth.uid() or app.can(c.organization_id, c.site_id, 'capa.assign') or app.can(c.organization_id, c.site_id, 'capa.verify'))
    )
  ) with check (
    exists (
      select 1 from public.capas c where c.id = capa_id
      and (c.assigned_to = auth.uid() or app.can(c.organization_id, c.site_id, 'capa.assign') or app.can(c.organization_id, c.site_id, 'capa.verify'))
    )
  );

create policy capa_fishbone_select on public.capa_fishbone_causes
  for select using (
    exists (select 1 from public.capas c where c.id = capa_id and app.has_site_access(c.organization_id, c.site_id))
  );

create policy capa_fishbone_write on public.capa_fishbone_causes
  for all using (
    exists (
      select 1 from public.capas c where c.id = capa_id
      and (c.assigned_to = auth.uid() or app.can(c.organization_id, c.site_id, 'capa.assign') or app.can(c.organization_id, c.site_id, 'capa.verify'))
    )
  ) with check (
    exists (
      select 1 from public.capas c where c.id = capa_id
      and (c.assigned_to = auth.uid() or app.can(c.organization_id, c.site_id, 'capa.assign') or app.can(c.organization_id, c.site_id, 'capa.verify'))
    )
  );
