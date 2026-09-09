-- =============================================================================
-- 0007_templates.sql
-- Checklist Template Builder: templates > sections > questions.
-- =============================================================================

create type public.template_status as enum ('draft', 'under_review', 'approved', 'published', 'archived');

create type public.question_type as enum (
  'yes_no', 'pass_fail', 'compliant_non_compliant',
  'text', 'long_text', 'number', 'decimal', 'temperature',
  'date', 'time', 'dropdown', 'multi_select',
  'photo', 'video', 'attachment', 'signature'
);

-- Question types whose answer can be evaluated as pass/fail automatically.
-- (used by the app and by the auto-finding trigger in 0009_findings.sql)
comment on type public.question_type is
  'yes_no / pass_fail / compliant_non_compliant carry a pass-or-fail semantic; number/decimal/temperature are pass/fail via min/max range; the rest are informational/evidence-only.';

create table public.templates (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  parent_template_id uuid references public.templates (id) on delete set null,
  code              text not null,
  name              text not null,
  name_ar           text,
  category          text not null default 'general',
  department_id     uuid references public.departments (id) on delete set null,
  description       text,
  version           integer not null default 1,
  status            public.template_status not null default 'draft',
  owner_id          uuid references public.profiles (id),
  created_by        uuid references public.profiles (id),
  approved_by       uuid references public.profiles (id),
  approved_at       timestamptz,
  published_at      timestamptz,
  archived_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (organization_id, code, version)
);

create index templates_org_idx on public.templates (organization_id, status);

create trigger templates_set_updated_at
  before update on public.templates
  for each row execute function public.set_updated_at();

create trigger templates_audit
  after insert or update or delete on public.templates
  for each row execute function public.log_audit();

-- ---------------------------------------------------------------- sections
create table public.template_sections (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  template_id     uuid not null references public.templates (id) on delete cascade,
  title           text not null,
  title_ar        text,
  description     text,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index template_sections_template_idx on public.template_sections (template_id, sort_order);

create trigger template_sections_set_updated_at
  before update on public.template_sections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- questions
create table public.template_questions (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organizations (id) on delete cascade,
  template_id              uuid not null references public.templates (id) on delete cascade,
  section_id               uuid not null references public.template_sections (id) on delete cascade,
  sort_order               integer not null default 0,
  prompt                   text not null,
  prompt_ar                text,
  type                     public.question_type not null,
  is_required              boolean not null default true,
  weight                   numeric not null default 1,
  is_critical              boolean not null default false,
  instructions             text,
  min_value                numeric,
  max_value                numeric,
  unit                     text,
  options                  jsonb not null default '[]'::jsonb,
  require_photo_on_fail    boolean not null default false,
  require_comment_on_fail  boolean not null default true,
  require_capa_on_fail     boolean not null default true,
  -- Placeholder for future conditional-logic engine, e.g.
  -- {"dependsOnQuestionId": "...", "showWhenAnswerIn": ["fail"]}
  condition                jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint template_questions_range_chk check (
    min_value is null or max_value is null or min_value <= max_value
  )
);

create index template_questions_section_idx on public.template_questions (section_id, sort_order);
create index template_questions_template_idx on public.template_questions (template_id);

create trigger template_questions_set_updated_at
  before update on public.template_questions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- status transitions
create or replace function public.templates_validate_transition()
returns trigger
language plpgsql
as $$
declare
  v_can_create  boolean := app.can(new.organization_id, null, 'template.create');
  v_can_review  boolean := app.can(new.organization_id, null, 'template.review');
  v_can_publish boolean := app.can(new.organization_id, null, 'template.publish');
begin
  if tg_op = 'UPDATE' and new.status <> old.status then
    if not (
      (old.status = 'draft'        and new.status = 'under_review') or
      (old.status = 'under_review' and new.status in ('approved', 'draft')) or
      (old.status = 'approved'     and new.status in ('published', 'draft')) or
      (old.status = 'published'    and new.status = 'archived')
    ) then
      raise exception 'Illegal template status transition: % -> %', old.status, new.status;
    end if;

    -- RLS grants UPDATE to anyone holding ANY of template.create/review/publish;
    -- which specific transition they may perform is enforced here.
    if new.status = 'under_review' and not (v_can_create or v_can_review) then
      raise exception 'Not authorized: submitting a template for review requires template.create or template.review';
    elsif old.status = 'under_review' and new.status in ('approved', 'draft') and not v_can_review then
      raise exception 'Not authorized: approving or rejecting a template requires template.review';
    elsif old.status = 'approved' and new.status = 'draft' and not (v_can_create or v_can_review) then
      raise exception 'Not authorized: reopening an approved template for edits requires template.create or template.review';
    elsif new.status = 'published' and not v_can_publish then
      raise exception 'Not authorized: publishing a template requires template.publish';
    elsif new.status = 'archived' and not v_can_publish then
      raise exception 'Not authorized: archiving a template requires template.publish';
    end if;

    if new.status = 'approved' then
      new.approved_at := now();
      new.approved_by := coalesce(new.approved_by, auth.uid());
    elsif new.status = 'published' then
      new.published_at := now();
    elsif new.status = 'archived' then
      new.archived_at := now();
    end if;
  end if;

  -- Structure (sections/questions) may only change while still editable.
  return new;
end;
$$;

create trigger templates_status_transition
  before update on public.templates
  for each row execute function public.templates_validate_transition();

-- Prevent editing the structure of a template that is no longer editable
-- (approved/published/archived) - defense in depth alongside RLS below.
create or replace function public.template_structure_locked()
returns trigger
language plpgsql
as $$
declare
  v_status public.template_status;
begin
  select status into v_status from public.templates where id = coalesce(new.template_id, old.template_id);
  if v_status not in ('draft', 'under_review') then
    raise exception 'Template structure is locked once it leaves Draft/Under Review (current status: %). Create a new version instead.', v_status;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger template_sections_lock
  before insert or update or delete on public.template_sections
  for each row execute function public.template_structure_locked();

create trigger template_questions_lock
  before insert or update or delete on public.template_questions
  for each row execute function public.template_structure_locked();

-- Duplicate a published/approved template into a fresh Draft version so it
-- can be revised without mutating the version everyone already used.
create or replace function public.create_template_revision(p_template_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_id uuid;
  v_old public.templates%rowtype;
  v_section record;
  v_new_section_id uuid;
begin
  select * into v_old from public.templates where id = p_template_id;
  if not found then
    raise exception 'Template % not found', p_template_id;
  end if;
  if not app.can(v_old.organization_id, null, 'template.create') then
    raise exception 'Not permitted';
  end if;

  insert into public.templates (
    organization_id, parent_template_id, code, name, name_ar, category,
    department_id, description, version, status, owner_id, created_by
  ) values (
    v_old.organization_id, v_old.id, v_old.code, v_old.name, v_old.name_ar, v_old.category,
    v_old.department_id, v_old.description, v_old.version + 1, 'draft', v_old.owner_id, auth.uid()
  ) returning id into v_new_id;

  for v_section in select * from public.template_sections where template_id = p_template_id order by sort_order loop
    insert into public.template_sections (organization_id, template_id, title, title_ar, description, sort_order)
    values (v_old.organization_id, v_new_id, v_section.title, v_section.title_ar, v_section.description, v_section.sort_order)
    returning id into v_new_section_id;

    insert into public.template_questions (
      organization_id, template_id, section_id, sort_order, prompt, prompt_ar, type,
      is_required, weight, is_critical, instructions, min_value, max_value, unit, options,
      require_photo_on_fail, require_comment_on_fail, require_capa_on_fail, condition
    )
    select
      v_old.organization_id, v_new_id, v_new_section_id, sort_order, prompt, prompt_ar, type,
      is_required, weight, is_critical, instructions, min_value, max_value, unit, options,
      require_photo_on_fail, require_comment_on_fail, require_capa_on_fail, condition
    from public.template_questions
    where section_id = v_section.id;
  end loop;

  return v_new_id;
end;
$$;

-- ---------------------------------------------------------------- RLS
alter table public.templates enable row level security;
alter table public.template_sections enable row level security;
alter table public.template_questions enable row level security;

create policy templates_select on public.templates
  for select using (app.is_org_member(organization_id));

create policy templates_insert on public.templates
  for insert with check (app.can(organization_id, null, 'template.create'));

create policy templates_update on public.templates
  for update using (
    app.can(organization_id, null, 'template.create')
    or app.can(organization_id, null, 'template.review')
    or app.can(organization_id, null, 'template.publish')
  ) with check (
    app.can(organization_id, null, 'template.create')
    or app.can(organization_id, null, 'template.review')
    or app.can(organization_id, null, 'template.publish')
  );

create policy templates_delete on public.templates
  for delete using (app.can(organization_id, null, 'template.create') and status = 'draft');

create policy template_sections_select on public.template_sections
  for select using (app.is_org_member(organization_id));

create policy template_sections_write on public.template_sections
  for all using (app.can(organization_id, null, 'template.create'))
  with check (app.can(organization_id, null, 'template.create'));

create policy template_questions_select on public.template_questions
  for select using (app.is_org_member(organization_id));

create policy template_questions_write on public.template_questions
  for all using (app.can(organization_id, null, 'template.create'))
  with check (app.can(organization_id, null, 'template.create'));
