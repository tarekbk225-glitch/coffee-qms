-- =============================================================================
-- 0008_inspections.sql
-- Inspection scheduling, execution and scoring.
-- =============================================================================

create type public.inspection_status as enum (
  'scheduled', 'in_progress', 'completed', 'submitted',
  'under_review', 'approved', 'rejected', 'closed', 'cancelled'
);

create type public.schedule_frequency as enum ('daily', 'weekly', 'monthly', 'quarterly', 'annual', 'custom');

create type public.answer_status as enum ('pending', 'pass', 'fail', 'na');

create type public.question_polarity as enum ('positive', 'negative');

alter table public.template_questions
  add column polarity public.question_polarity not null default 'positive';

comment on column public.template_questions.polarity is
  'Only meaningful for yes_no questions: positive = "Yes" passes (e.g. "Is the area clean?"), negative = "No" passes (e.g. "Any signs of pests?").';

-- ---------------------------------------------------------------- inspections
create table public.inspections (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations (id) on delete cascade,
  site_id            uuid not null references public.sites (id) on delete cascade,
  department_id      uuid references public.departments (id) on delete set null,
  area_id            uuid references public.areas (id) on delete set null,
  template_id        uuid not null references public.templates (id),
  template_version   integer not null,
  inspector_id       uuid references public.profiles (id),
  assigned_team_id   uuid references public.teams (id),
  status             public.inspection_status not null default 'scheduled',
  scheduled_date     date not null default current_date,
  started_at         timestamptz,
  completed_at       timestamptz,
  submitted_at       timestamptz,
  reviewed_at        timestamptz,
  reviewed_by        uuid references public.profiles (id),
  approved_at        timestamptz,
  approved_by        uuid references public.profiles (id),
  score              numeric,
  compliance_percent numeric,
  comments           text,
  created_by         uuid references public.profiles (id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index inspections_org_site_idx on public.inspections (organization_id, site_id, status);
create index inspections_inspector_idx on public.inspections (inspector_id);
create index inspections_template_idx on public.inspections (template_id);
create index inspections_scheduled_date_idx on public.inspections (scheduled_date);

create trigger inspections_set_updated_at
  before update on public.inspections
  for each row execute function public.set_updated_at();

create trigger inspections_audit
  after insert or update or delete on public.inspections
  for each row execute function public.log_audit();

-- ---------------------------------------------------------------- answers
create table public.inspection_answers (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  inspection_id    uuid not null references public.inspections (id) on delete cascade,
  question_id      uuid not null references public.template_questions (id),
  section_id       uuid not null references public.template_sections (id),
  value_bool       boolean,
  value_number     numeric,
  value_text       text,
  value_option     jsonb,
  value_date       date,
  value_time       time,
  status           public.answer_status not null default 'pending',
  is_critical_fail boolean not null default false,
  comment          text,
  answered_by      uuid references public.profiles (id),
  answered_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (inspection_id, question_id)
);

create index inspection_answers_inspection_idx on public.inspection_answers (inspection_id);
create index inspection_answers_status_idx on public.inspection_answers (status);

create trigger inspection_answers_set_updated_at
  before update on public.inspection_answers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- schedules (recurring)
create table public.inspection_schedules (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  site_id          uuid not null references public.sites (id) on delete cascade,
  department_id    uuid references public.departments (id) on delete set null,
  area_id          uuid references public.areas (id) on delete set null,
  template_id      uuid not null references public.templates (id),
  frequency        public.schedule_frequency not null,
  custom_rule      jsonb,
  assigned_to      uuid references public.profiles (id),
  assigned_team_id uuid references public.teams (id),
  next_due_date    date not null,
  is_active        boolean not null default true,
  created_by       uuid references public.profiles (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index inspection_schedules_due_idx on public.inspection_schedules (next_due_date) where is_active;

create trigger inspection_schedules_set_updated_at
  before update on public.inspection_schedules
  for each row execute function public.set_updated_at();

-- Generates the next occurrence's due date. Intended to be called by
-- public.generate_due_inspections() below (itself meant to be invoked on a
-- daily cron - see supabase/functions/README in the app repo for the
-- Phase 2 Edge Function that will call it on a schedule).
create or replace function public.next_due_date(p_from date, p_freq public.schedule_frequency)
returns date
language sql
immutable
as $$
  select case p_freq
    when 'daily' then p_from + interval '1 day'
    when 'weekly' then p_from + interval '7 days'
    when 'monthly' then p_from + interval '1 month'
    when 'quarterly' then p_from + interval '3 months'
    when 'annual' then p_from + interval '1 year'
    else p_from + interval '1 day'
  end;
$$;

create or replace function public.generate_due_inspections()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule record;
  v_count integer := 0;
begin
  for v_schedule in
    select * from public.inspection_schedules
    where is_active and next_due_date <= current_date
  loop
    insert into public.inspections (
      organization_id, site_id, department_id, area_id, template_id, template_version,
      inspector_id, assigned_team_id, status, scheduled_date, created_by
    )
    select
      v_schedule.organization_id, v_schedule.site_id, v_schedule.department_id, v_schedule.area_id,
      v_schedule.template_id, t.version, v_schedule.assigned_to, v_schedule.assigned_team_id,
      'scheduled', v_schedule.next_due_date, v_schedule.assigned_to
    from public.templates t where t.id = v_schedule.template_id;

    update public.inspection_schedules
      set next_due_date = public.next_due_date(v_schedule.next_due_date, v_schedule.frequency)
      where id = v_schedule.id;

    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

comment on function public.generate_due_inspections() is
  'Materializes one public.inspections row per due public.inspection_schedules row and rolls next_due_date forward. Call from a scheduled Edge Function/cron (Phase 2) or manually.';

-- ---------------------------------------------------------------- answer scoring
create or replace function public.compute_answer_status()
returns trigger
language plpgsql
as $$
declare
  q public.template_questions%rowtype;
  v_pass boolean;
begin
  select * into q from public.template_questions where id = new.question_id;
  new.organization_id := coalesce(new.organization_id, q.organization_id);
  new.answered_at := coalesce(new.answered_at, now());

  case q.type
    when 'yes_no' then
      if new.value_bool is null then
        new.status := 'pending';
      else
        v_pass := (q.polarity = 'positive' and new.value_bool = true)
               or (q.polarity = 'negative' and new.value_bool = false);
        new.status := (case when v_pass then 'pass' else 'fail' end)::public.answer_status;
      end if;

    when 'pass_fail' then
      new.status := (case new.value_text when 'pass' then 'pass' when 'fail' then 'fail' else 'pending' end)::public.answer_status;

    when 'compliant_non_compliant' then
      new.status := (case new.value_text when 'compliant' then 'pass' when 'non_compliant' then 'fail' else 'pending' end)::public.answer_status;

    when 'number', 'decimal', 'temperature' then
      if new.value_number is null then
        new.status := 'pending';
      else
        v_pass := (q.min_value is null or new.value_number >= q.min_value)
              and (q.max_value is null or new.value_number <= q.max_value);
        new.status := (case when v_pass then 'pass' else 'fail' end)::public.answer_status;
      end if;

    else
      -- text/long_text/date/time/dropdown/multi_select/photo/video/attachment/signature:
      -- evidence/informational, not auto-graded.
      new.status := (case
        when new.value_text is not null or new.value_option is not null
          or new.value_date is not null or new.value_time is not null
        then 'na' else 'pending' end)::public.answer_status;
  end case;

  new.is_critical_fail := (new.status = 'fail' and q.is_critical);

  return new;
end;
$$;

create trigger inspection_answers_compute_status
  before insert or update on public.inspection_answers
  for each row execute function public.compute_answer_status();

-- Recompute the parent inspection's score/compliance whenever an answer changes.
create or replace function public.recompute_inspection_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inspection_id uuid := coalesce(new.inspection_id, old.inspection_id);
  v_total numeric;
  v_earned numeric;
  v_evaluable integer;
  v_passed integer;
begin
  select
    coalesce(sum(tq.weight) filter (where a.status in ('pass','fail')), 0),
    coalesce(sum(tq.weight) filter (where a.status = 'pass'), 0),
    count(*) filter (where a.status in ('pass','fail')),
    count(*) filter (where a.status = 'pass')
  into v_total, v_earned, v_evaluable, v_passed
  from public.inspection_answers a
  join public.template_questions tq on tq.id = a.question_id
  where a.inspection_id = v_inspection_id;

  update public.inspections
  set
    score = case when v_total > 0 then round(v_earned / v_total * 100, 1) else null end,
    compliance_percent = case when v_evaluable > 0 then round(v_passed::numeric / v_evaluable * 100, 1) else null end
  where id = v_inspection_id;

  return null;
end;
$$;

create trigger inspection_answers_recompute
  after insert or update or delete on public.inspection_answers
  for each row execute function public.recompute_inspection_score();

-- ---------------------------------------------------------------- inspection status workflow
create or replace function public.inspections_validate_transition()
returns trigger
language plpgsql
as $$
declare
  v_is_inspector boolean := (new.inspector_id = auth.uid());
  v_can_schedule boolean := app.can(new.organization_id, new.site_id, 'inspection.schedule');
  v_can_review   boolean := app.can(new.organization_id, new.site_id, 'inspection.review');
  v_can_approve  boolean := app.can(new.organization_id, new.site_id, 'inspection.approve');
begin
  if tg_op = 'UPDATE' and new.status <> old.status then
    if not (
      (old.status = 'scheduled'    and new.status in ('in_progress', 'cancelled')) or
      (old.status = 'in_progress'  and new.status in ('completed', 'cancelled')) or
      (old.status = 'completed'    and new.status in ('submitted', 'in_progress')) or
      (old.status = 'submitted'    and new.status in ('under_review')) or
      (old.status = 'under_review' and new.status in ('approved', 'rejected')) or
      (old.status = 'rejected'     and new.status in ('in_progress', 'cancelled')) or
      (old.status = 'approved'     and new.status in ('closed'))
    ) then
      raise exception 'Illegal inspection status transition: % -> %', old.status, new.status;
    end if;

    -- RLS only proves the caller may touch this row (inspector_id = auth.uid()
    -- OR any inspection.* permission). Which step they may perform is
    -- enforced here.
    if new.status in ('in_progress', 'completed', 'submitted') and not (v_is_inspector or v_can_schedule) then
      raise exception 'Not authorized: only the assigned inspector (or inspection.schedule) can run this inspection';
    elsif new.status = 'under_review' and not v_can_review then
      raise exception 'Not authorized: moving an inspection into review requires inspection.review';
    elsif new.status in ('approved', 'rejected') and not v_can_approve then
      raise exception 'Not authorized: approving or rejecting an inspection requires inspection.approve';
    elsif new.status = 'in_progress' and old.status = 'rejected' and not (v_is_inspector or v_can_schedule) then
      raise exception 'Not authorized: only the assigned inspector (or inspection.schedule) can rework a rejected inspection';
    elsif new.status = 'closed' and not v_can_approve then
      raise exception 'Not authorized: closing an inspection requires inspection.approve';
    elsif new.status = 'cancelled' and not v_can_schedule then
      raise exception 'Not authorized: cancelling an inspection requires inspection.schedule';
    end if;

    if new.status = 'in_progress' and old.status = 'scheduled' then
      new.started_at := coalesce(new.started_at, now());
    elsif new.status = 'completed' then
      new.completed_at := now();
    elsif new.status = 'submitted' then
      new.submitted_at := now();
    elsif new.status = 'under_review' then
      new.reviewed_at := now();
      new.reviewed_by := coalesce(new.reviewed_by, auth.uid());
    elsif new.status = 'approved' then
      new.approved_at := now();
      new.approved_by := coalesce(new.approved_by, auth.uid());
    end if;
  end if;
  return new;
end;
$$;

create trigger inspections_status_transition
  before update on public.inspections
  for each row execute function public.inspections_validate_transition();

-- ---------------------------------------------------------------- RLS
alter table public.inspections enable row level security;
alter table public.inspection_answers enable row level security;
alter table public.inspection_schedules enable row level security;

create policy inspections_select on public.inspections
  for select using (app.has_site_access(organization_id, site_id));

create policy inspections_insert on public.inspections
  for insert with check (
    app.can(organization_id, site_id, 'inspection.schedule') or app.can(organization_id, site_id, 'inspection.create')
  );

create policy inspections_update on public.inspections
  for update using (
    inspector_id = auth.uid()
    or app.can(organization_id, site_id, 'inspection.schedule')
    or app.can(organization_id, site_id, 'inspection.review')
    or app.can(organization_id, site_id, 'inspection.approve')
  ) with check (
    inspector_id = auth.uid()
    or app.can(organization_id, site_id, 'inspection.schedule')
    or app.can(organization_id, site_id, 'inspection.review')
    or app.can(organization_id, site_id, 'inspection.approve')
  );

create policy inspections_delete on public.inspections
  for delete using (app.can(organization_id, site_id, 'inspection.schedule') and status = 'scheduled');

create policy inspection_answers_select on public.inspection_answers
  for select using (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id and app.has_site_access(i.organization_id, i.site_id)
    )
  );

create policy inspection_answers_write on public.inspection_answers
  for all using (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.status in ('scheduled', 'in_progress')
        and (i.inspector_id = auth.uid() or app.can(i.organization_id, i.site_id, 'inspection.schedule'))
    )
  ) with check (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.status in ('scheduled', 'in_progress')
        and (i.inspector_id = auth.uid() or app.can(i.organization_id, i.site_id, 'inspection.schedule'))
    )
  );

create policy inspection_schedules_select on public.inspection_schedules
  for select using (app.has_site_access(organization_id, site_id));

create policy inspection_schedules_write on public.inspection_schedules
  for all using (app.can(organization_id, site_id, 'inspection.schedule'))
  with check (app.can(organization_id, site_id, 'inspection.schedule'));
