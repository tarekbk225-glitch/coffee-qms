-- =============================================================================
-- 0012_evidence_files.sql
-- Evidence (photos/videos/documents/signatures) stored in Supabase Storage,
-- always linked to a real database record - never a giant base64 blob in
-- Postgres. Storage object paths follow the convention:
--   evidence/{organization_id}/{entity_type}/{entity_id}/{uuid}-{filename}
-- =============================================================================

create type public.evidence_kind as enum ('photo', 'video', 'document', 'signature', 'other');

create table public.evidence_files (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  site_id         uuid references public.sites (id) on delete cascade,
  entity_type     text not null,
  entity_id       uuid not null,
  bucket          text not null default 'evidence',
  file_path       text not null unique,
  file_name       text not null,
  mime_type       text,
  size_bytes      bigint,
  kind            public.evidence_kind not null default 'other',
  caption         text,
  uploaded_by     uuid references public.profiles (id),
  uploaded_at     timestamptz not null default now(),
  constraint evidence_files_entity_type_chk check (
    entity_type in ('inspection', 'inspection_answer', 'finding', 'capa', 'asset')
  )
);

create index evidence_files_entity_idx on public.evidence_files (entity_type, entity_id);
create index evidence_files_org_idx on public.evidence_files (organization_id);

-- Resolve and *verify* organization_id/site_id from the real parent row
-- rather than trusting whatever the client sent - this is what stops a user
-- from spoofing evidence onto another organization's record.
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

create trigger evidence_files_validate_parent
  before insert on public.evidence_files
  for each row execute function public.validate_evidence_parent();

alter table public.evidence_files enable row level security;

create policy evidence_files_select on public.evidence_files
  for select using (app.has_site_access(organization_id, site_id));

create policy evidence_files_insert on public.evidence_files
  for insert with check (app.has_site_access(organization_id, site_id));

create policy evidence_files_delete on public.evidence_files
  for delete using (uploaded_by = auth.uid() or app.can(organization_id, site_id, 'admin.users.manage'));

-- ---------------------------------------------------------------- storage buckets
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;

-- Object path convention: {organization_id}/{entity_type}/{entity_id}/{filename}
-- storage.foldername(name) returns an array of path segments.
--
-- storage.objects lives in Supabase's own `storage` schema, not `public` -
-- so unlike every other policy in this project, re-running this migration
-- against a database that already has it applied won't be caught by a
-- `drop schema public cascade` reset. Drop-if-exists first so this file is
-- safely re-runnable on its own.
drop policy if exists evidence_bucket_select on storage.objects;
create policy evidence_bucket_select on storage.objects
  for select using (
    bucket_id = 'evidence'
    and app.is_org_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists evidence_bucket_insert on storage.objects;
create policy evidence_bucket_insert on storage.objects
  for insert with check (
    bucket_id = 'evidence'
    and app.is_org_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists evidence_bucket_delete on storage.objects;
create policy evidence_bucket_delete on storage.objects
  for delete using (
    bucket_id = 'evidence'
    and (owner = auth.uid() or app.can((storage.foldername(name))[1]::uuid, null, 'admin.users.manage'))
  );
