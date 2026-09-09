-- =============================================================================
-- 0009_findings.sql
-- Non-conformities / findings, generated automatically from failed inspection
-- answers (or raised manually), plus the shared per-organization counter
-- used to mint human-readable sequence numbers (FIND-2026-00001, ...).
-- =============================================================================

create table public.counters (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  key             text not null,
  value           bigint not null default 0,
  primary key (organization_id, key)
);

create or replace function public.next_counter(p_org uuid, p_key text)
returns bigint
language sql
security definer
set search_path = public
as $$
  insert into public.counters (organization_id, key, value)
  values (p_org, p_key, 1)
  on conflict (organization_id, key) do update set value = public.counters.value + 1
  returning value;
$$;

create type public.finding_source as enum ('inspection', 'manual', 'audit', 'other');
create type public.finding_severity as enum ('low', 'medium', 'high', 'critical');
create type public.finding_status as enum (
  'open', 'assigned', 'investigation', 'action_required', 'verification', 'closed', 'rejected'
);

create table public.findings (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations (id) on delete cascade,
  site_id              uuid not null references public.sites (id) on delete cascade,
  department_id        uuid references public.departments (id) on delete set null,
  finding_number       text not null,
  source               public.finding_source not null default 'manual',
  inspection_id        uuid references public.inspections (id) on delete set null,
  inspection_answer_id uuid references public.inspection_answers (id) on delete set null,
  question_snapshot    text,
  description          text not null,
  severity             public.finding_severity not null default 'medium',
  category             text,
  detected_by          uuid references public.profiles (id),
  detected_date         date not null default current_date,
  immediate_action     text,
  root_cause           text,
  status               public.finding_status not null default 'open',
  assigned_to          uuid references public.profiles (id),
  created_by           uuid references public.profiles (id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  closed_at            timestamptz,
  unique (organization_id, finding_number)
);

create unique index findings_answer_unique_idx on public.findings (inspection_answer_id) where inspection_answer_id is not null;
create index findings_org_site_idx on public.findings (organization_id, site_id, status);
create index findings_severity_idx on public.findings (severity);
create index findings_assigned_idx on public.findings (assigned_to);

create trigger findings_set_updated_at
  before update on public.findings
  for each row execute function public.set_updated_at();

create trigger findings_audit
  after insert or update or delete on public.findings
  for each row execute function public.log_audit();

create or replace function public.findings_assign_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.finding_number is null then
    new.finding_number := 'NC-' || to_char(now(), 'YYYY') || '-' || lpad(public.next_counter(new.organization_id, 'finding')::text, 5, '0');
  end if;
  return new;
end;
$$;

create trigger findings_assign_number_trg
  before insert on public.findings
  for each row execute function public.findings_assign_number();

create or replace function public.findings_validate_transition()
returns trigger
language plpgsql
as $$
declare
  v_is_assignee boolean := (new.assigned_to = auth.uid());
  v_can_manage  boolean := app.can(new.organization_id, new.site_id, 'finding.manage');
  v_can_close   boolean := app.can(new.organization_id, new.site_id, 'finding.close');
begin
  if tg_op = 'UPDATE' and new.status <> old.status then
    if not (
      (old.status = 'open'            and new.status in ('assigned', 'closed', 'rejected')) or
      (old.status = 'assigned'        and new.status in ('investigation', 'action_required', 'closed')) or
      (old.status = 'investigation'   and new.status in ('action_required', 'closed')) or
      (old.status = 'action_required' and new.status in ('verification')) or
      (old.status = 'verification'    and new.status in ('closed', 'action_required'))
    ) then
      raise exception 'Illegal finding status transition: % -> %', old.status, new.status;
    end if;

    -- Same principle as CAPAs: the RLS "assigned_to = auth.uid()" clause only
    -- proves the caller may touch this row, not which step they may perform.
    if new.status in ('assigned', 'rejected') and not v_can_manage then
      raise exception 'Not authorized: this transition requires finding.manage';
    elsif new.status in ('investigation', 'action_required') and not (v_can_manage or v_is_assignee) then
      raise exception 'Not authorized: this transition requires finding.manage or being the assignee';
    elsif new.status = 'verification' and not (v_can_manage or v_is_assignee) then
      raise exception 'Not authorized: submitting a finding for verification requires finding.manage or being the assignee';
    elsif new.status = 'closed' and not (v_can_manage or v_can_close) then
      raise exception 'Not authorized: closing a finding requires finding.manage or finding.close';
    end if;

    if new.status = 'closed' then
      new.closed_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger findings_status_transition
  before update on public.findings
  for each row execute function public.findings_validate_transition();

-- ---------------------------------------------------------------- auto-generate from failed answers
create or replace function public.auto_create_finding_from_answer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.template_questions%rowtype;
  i public.inspections%rowtype;
begin
  if new.status <> 'fail' then
    return new;
  end if;

  select * into q from public.template_questions where id = new.question_id;
  select * into i from public.inspections where id = new.inspection_id;

  insert into public.findings (
    organization_id, site_id, department_id, source, inspection_id, inspection_answer_id,
    question_snapshot, description, severity, category, detected_by, immediate_action, created_by
  )
  values (
    i.organization_id, i.site_id, i.department_id, 'inspection', i.id, new.id,
    q.prompt,
    coalesce(new.comment, 'فشل في البند: ' || q.prompt),
    case when q.is_critical then 'critical' else 'medium' end::public.finding_severity,
    'inspection_failure',
    coalesce(new.answered_by, i.inspector_id),
    null,
    coalesce(new.answered_by, i.inspector_id)
  )
  on conflict (inspection_answer_id) where inspection_answer_id is not null do nothing;

  return new;
end;
$$;

create trigger inspection_answers_auto_finding
  after insert or update on public.inspection_answers
  for each row
  when (new.status = 'fail')
  execute function public.auto_create_finding_from_answer();

-- ---------------------------------------------------------------- RLS
alter table public.findings enable row level security;

create policy findings_select on public.findings
  for select using (app.has_site_access(organization_id, site_id));

create policy findings_insert on public.findings
  for insert with check (app.can(organization_id, site_id, 'finding.manage'));

create policy findings_update on public.findings
  for update using (
    app.can(organization_id, site_id, 'finding.manage')
    or app.can(organization_id, site_id, 'finding.close')
    or assigned_to = auth.uid()
  ) with check (
    app.can(organization_id, site_id, 'finding.manage')
    or app.can(organization_id, site_id, 'finding.close')
    or assigned_to = auth.uid()
  );
