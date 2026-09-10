-- =============================================================================
-- 0016_document_control_certificates.sql
-- Document Control (versioned SOPs/policies/specifications, per README "Future
-- phases") plus Certificates & Official Paper Validity tracking (municipality
-- licenses, health/civil-defense certificates, etc.) - a natural extension of
-- the same module for tracking issue/expiry dates and renewal ownership.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- documents: controlled internal documents. Versioning mirrors 0007_templates
-- exactly - a new version is a NEW row (parent_document_id -> previous row),
-- never an in-place overwrite, so old versions stay permanently accessible.
-- -----------------------------------------------------------------------------
create type public.document_type as enum (
  'sop', 'policy', 'work_instruction', 'form', 'specification',
  'haccp_document', 'cleaning_procedure', 'maintenance_procedure', 'other'
);

create type public.document_status as enum ('draft', 'review', 'approved', 'active', 'obsolete');

create table public.documents (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations (id) on delete cascade,
  parent_document_id  uuid references public.documents (id) on delete set null,
  department_id       uuid references public.departments (id) on delete set null,
  document_number     text not null,
  title               text not null,
  title_ar            text,
  document_type       public.document_type not null default 'sop',
  version             integer not null default 1,
  status              public.document_status not null default 'draft',
  owner_id            uuid references public.profiles (id),
  created_by          uuid references public.profiles (id),
  approved_by         uuid references public.profiles (id),
  approved_at         timestamptz,
  effective_date      date,
  review_date         date,
  obsoleted_at        timestamptz,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (organization_id, document_number, version)
);

create index documents_org_idx on public.documents (organization_id, status);
create index documents_number_idx on public.documents (organization_id, document_number);
create index documents_review_due_idx on public.documents (review_date) where status = 'active';

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

create trigger documents_audit
  after insert or update or delete on public.documents
  for each row execute function public.log_audit();

-- A new document keeps minting its own number; a new *version* of an
-- existing document (parent_document_id set) inherits the parent's number.
create or replace function public.documents_assign_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.document_number is null then
    if new.parent_document_id is not null then
      select document_number into new.document_number
      from public.documents where id = new.parent_document_id;
    else
      new.document_number := 'DOC-' || to_char(now(), 'YYYY') || '-' || lpad(public.next_counter(new.organization_id, 'document')::text, 5, '0');
    end if;
  end if;
  return new;
end;
$$;

create trigger documents_assign_number_trg
  before insert on public.documents
  for each row execute function public.documents_assign_number();

-- Status lifecycle: Draft -> Review -> Approved -> Active -> Obsolete
-- (Review/Approved can also bounce back to Draft to request changes).
create or replace function public.documents_validate_transition()
returns trigger
language plpgsql
as $$
declare
  v_can boolean := app.can(new.organization_id, null, 'document.manage');
begin
  if tg_op = 'UPDATE' and new.status <> old.status then
    if not (
      (old.status = 'draft'    and new.status = 'review') or
      (old.status = 'review'   and new.status in ('approved', 'draft')) or
      (old.status = 'approved' and new.status in ('active', 'draft')) or
      (old.status = 'active'   and new.status = 'obsolete')
    ) then
      raise exception 'Illegal document status transition: % -> %', old.status, new.status;
    end if;

    if not v_can then
      raise exception 'Not authorized: changing a document status requires document.manage';
    end if;

    if new.status = 'approved' then
      new.approved_at := now();
      new.approved_by := coalesce(new.approved_by, auth.uid());
    elsif new.status = 'active' then
      new.effective_date := coalesce(new.effective_date, current_date);
    elsif new.status = 'obsolete' then
      new.obsoleted_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger documents_status_transition
  before update on public.documents
  for each row execute function public.documents_validate_transition();

-- When a version becomes Active, automatically retire any other Active
-- version of the same document (only one Active version at a time).
create or replace function public.documents_supersede_previous()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' and (old.status is distinct from 'active') then
    update public.documents
    set status = 'obsolete'
    where organization_id = new.organization_id
      and document_number = new.document_number
      and id <> new.id
      and status = 'active';
  end if;
  return new;
end;
$$;

create trigger documents_supersede_previous_trg
  after update on public.documents
  for each row execute function public.documents_supersede_previous();

-- Duplicate an existing document into a fresh Draft version, exactly like
-- public.create_template_revision() does for templates.
create or replace function public.create_document_revision(p_document_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_id uuid;
  v_old public.documents%rowtype;
begin
  select * into v_old from public.documents where id = p_document_id;
  if not found then
    raise exception 'Document % not found', p_document_id;
  end if;
  if not app.can(v_old.organization_id, null, 'document.manage') then
    raise exception 'Not permitted';
  end if;

  insert into public.documents (
    organization_id, parent_document_id, department_id, title, title_ar,
    document_type, version, status, owner_id, created_by, notes
  ) values (
    v_old.organization_id, v_old.id, v_old.department_id, v_old.title, v_old.title_ar,
    v_old.document_type, v_old.version + 1, 'draft', v_old.owner_id, auth.uid(), v_old.notes
  ) returning id into v_new_id;

  return v_new_id;
end;
$$;

alter table public.documents enable row level security;

create policy documents_select on public.documents
  for select using (app.is_org_member(organization_id));

create policy documents_insert on public.documents
  for insert with check (app.can(organization_id, null, 'document.manage'));

create policy documents_update on public.documents
  for update using (app.can(organization_id, null, 'document.manage'))
  with check (app.can(organization_id, null, 'document.manage'));
-- No delete policy: retire a document via status = 'obsolete' instead.

-- -----------------------------------------------------------------------------
-- certificates: external regulatory certificates & official papers
-- (municipality license, health/civil-defense certificates, etc.) with
-- issue/expiry tracking, renewal ownership, and expiry-reminder support.
-- -----------------------------------------------------------------------------
create type public.certificate_type as enum (
  'municipality_license', 'health_certificate', 'civil_defense_certificate',
  'environmental_approval', 'industrial_license', 'food_safety_certification', 'other'
);

create type public.certificate_status as enum ('active', 'renewed', 'cancelled');

create table public.certificates (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations (id) on delete cascade,
  site_id             uuid references public.sites (id) on delete cascade,
  certificate_number  text not null,
  name                text not null,
  name_ar             text,
  certificate_type    public.certificate_type not null default 'other',
  issuing_authority   text,
  external_reference  text,
  issue_date          date,
  expiry_date         date,
  status              public.certificate_status not null default 'active',
  responsible_user_id uuid references public.profiles (id),
  notes               text,
  created_by          uuid references public.profiles (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (organization_id, certificate_number)
);

create index certificates_org_site_idx on public.certificates (organization_id, site_id, status);
create index certificates_expiry_idx on public.certificates (expiry_date) where status = 'active';

create trigger certificates_set_updated_at
  before update on public.certificates
  for each row execute function public.set_updated_at();

create trigger certificates_audit
  after insert or update or delete on public.certificates
  for each row execute function public.log_audit();

create or replace function public.certificates_assign_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.certificate_number is null then
    new.certificate_number := 'CERT-' || to_char(now(), 'YYYY') || '-' || lpad(public.next_counter(new.organization_id, 'certificate')::text, 5, '0');
  end if;
  return new;
end;
$$;

create trigger certificates_assign_number_trg
  before insert on public.certificates
  for each row execute function public.certificates_assign_number();

alter table public.certificates enable row level security;

create policy certificates_select on public.certificates
  for select using (app.has_site_access(organization_id, site_id));

create policy certificates_insert on public.certificates
  for insert with check (app.can(organization_id, site_id, 'document.manage'));

create policy certificates_update on public.certificates
  for update using (app.can(organization_id, site_id, 'document.manage'))
  with check (app.can(organization_id, site_id, 'document.manage'));
-- No delete policy: cancel via status = 'cancelled' instead.

-- -----------------------------------------------------------------------------
-- evidence_files: widen entity_type to allow attaching files to documents and
-- certificates (scanned certificate copies, signed SOPs, ...).
-- -----------------------------------------------------------------------------
alter table public.evidence_files drop constraint if exists evidence_files_entity_type_chk;
alter table public.evidence_files add constraint evidence_files_entity_type_chk check (
  entity_type in (
    'inspection', 'inspection_answer', 'finding', 'capa', 'asset',
    'sanitation_check', 'document', 'certificate'
  )
);

create or replace function public.validate_evidence_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_site uuid;
begin
  case new.entity_type
    when 'inspection' then
      select organization_id, site_id into v_org, v_site from public.inspections where id = new.entity_id;
    when 'inspection_answer' then
      select i.organization_id, i.site_id into v_org, v_site
      from public.inspection_answers a join public.inspections i on i.id = a.inspection_id
      where a.id = new.entity_id;
    when 'finding' then
      select organization_id, site_id into v_org, v_site from public.findings where id = new.entity_id;
    when 'capa' then
      select organization_id, site_id into v_org, v_site from public.capas where id = new.entity_id;
    when 'asset' then
      select organization_id, site_id into v_org, v_site from public.assets where id = new.entity_id;
    when 'sanitation_check' then
      select s.organization_id, s.site_id into v_org, v_site
      from public.sanitation_checks c join public.sanitation_stations s on s.id = c.station_id
      where c.id = new.entity_id;
    when 'document' then
      select organization_id into v_org from public.documents where id = new.entity_id;
      v_site := null;
    when 'certificate' then
      select organization_id, site_id into v_org, v_site from public.certificates where id = new.entity_id;
    else
      raise exception 'Unsupported evidence entity_type: %', new.entity_type;
  end case;

  if v_org is null then
    raise exception 'Referenced % % was not found', new.entity_type, new.entity_id;
  end if;

  new.organization_id := v_org;
  new.site_id := v_site;
  new.uploaded_by := coalesce(new.uploaded_by, auth.uid());
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- permissions: single 'document.manage' permission covers both documents and
-- certificates (create/edit/transition status) - kept as one key since both
-- are the same "document control" job in practice, matching PROMPT section 36
-- ("choose sensible defaults" instead of over-splitting permissions).
-- -----------------------------------------------------------------------------
insert into public.permissions (key, category, description) values
  ('document.manage', 'document', 'Create, review, approve/activate and retire controlled documents and certificates/licenses')
on conflict (key) do nothing;

-- Existing role_permissions blanket-grants (0004) already ran against
-- production before this permission existed, so re-grant explicitly per role
-- exactly as 0015 did for pest_control.* - super_admin/factory_admin already
-- get every permission via their own blanket inserts below being redundant
-- with 0004, but included for a from-scratch install to stay self-contained.
insert into public.role_permissions (role_id, permission_key)
select r.id, 'document.manage' from public.roles r
where r.key in ('super_admin', 'factory_admin', 'quality_manager')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- reminders: extend the existing due-reminders stub (0013) with certificate
-- expiry and document review-due checks. CREATE OR REPLACE keeps this
-- idempotent and re-runnable.
-- -----------------------------------------------------------------------------
create or replace function public.generate_due_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_row record;
begin
  for v_row in
    select * from public.inspections
    where status = 'scheduled' and scheduled_date < current_date and inspector_id is not null
  loop
    perform public.create_notification(
      v_row.organization_id, v_row.inspector_id, 'inspection_overdue',
      'Inspection overdue', 'التفتيش متأخر عن موعده',
      'A scheduled inspection is overdue.', 'هناك تفتيش مجدول متأخر عن موعده.',
      'inspection', v_row.id
    );
    v_count := v_count + 1;
  end loop;

  for v_row in
    select * from public.capas
    where status not in ('closed', 'rejected') and due_date < current_date and assigned_to is not null
  loop
    perform public.create_notification(
      v_row.organization_id, v_row.assigned_to, 'capa_overdue',
      'CAPA overdue: ' || v_row.capa_number, 'الإجراء التصحيحي متأخر: ' || v_row.capa_number,
      'This CAPA is past its due date.', 'تجاوز هذا الإجراء تاريخ الاستحقاق.',
      'capa', v_row.id
    );
    v_count := v_count + 1;
  end loop;

  -- Certificates expiring within 30 days (or already expired).
  for v_row in
    select * from public.certificates
    where status = 'active' and expiry_date is not null and expiry_date <= current_date + 30
  loop
    perform public.notify_permission_holders(
      v_row.organization_id, v_row.site_id, 'document.manage', 'certificate_expiring',
      'Certificate expiring soon: ' || v_row.certificate_number, 'شهادة/ترخيص قارب على الانتهاء: ' || v_row.certificate_number,
      coalesce(v_row.name, v_row.certificate_number), coalesce(v_row.name_ar, v_row.name, v_row.certificate_number),
      'certificate', v_row.id
    );
    v_count := v_count + 1;
  end loop;

  -- Active documents whose scheduled review date has arrived.
  for v_row in
    select * from public.documents
    where status = 'active' and review_date is not null and review_date <= current_date
  loop
    perform public.notify_permission_holders(
      v_row.organization_id, null, 'document.manage', 'document_review_due',
      'Document review due: ' || v_row.document_number, 'مستند بحاجة إلى مراجعة: ' || v_row.document_number,
      coalesce(v_row.title, v_row.document_number), coalesce(v_row.title_ar, v_row.title, v_row.document_number),
      'document', v_row.id
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
