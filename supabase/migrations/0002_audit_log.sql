-- =============================================================================
-- 0002_audit_log.sql
-- Central, tamper-evident audit trail. Every important table gets a trigger
-- that writes an immutable row here on insert/update/delete. Application code
-- never writes to this table directly (no INSERT policy is granted to normal
-- roles anywhere in the migrations) - only the trigger function, running as
-- the table owner, is allowed to populate it.
-- =============================================================================

create type public.audit_action as enum (
  'created',
  'updated',
  'assigned',
  'status_changed',
  'submitted',
  'approved',
  'rejected',
  'closed',
  'reopened',
  'deleted'
);

create table public.audit_log (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  entity_type     text not null,
  entity_id       uuid not null,
  action          public.audit_action not null,
  actor_id        uuid,
  actor_name      text,
  old_value       jsonb,
  new_value       jsonb,
  note            text,
  created_at      timestamptz not null default now()
);

create index audit_log_org_created_idx on public.audit_log (organization_id, created_at desc);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id, created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id);

comment on table public.audit_log is
  'Immutable audit trail. Rows are only ever inserted by trigger functions (public.log_audit()), never updated or deleted, and no DELETE/UPDATE policy exists for any application role.';

-- -----------------------------------------------------------------------------
-- Generic audit trigger function.
-- Attach with:
--   create trigger <table>_audit
--     after insert or update or delete on public.<table>
--     for each row execute function public.log_audit();
--
-- Requires the table to have an `organization_id` column and, ideally, a
-- `status` column (used to infer a friendlier action than "updated").
-- -----------------------------------------------------------------------------
create or replace function public.log_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id   uuid;
  v_action   public.audit_action;
  v_actor    uuid := auth.uid();
  v_old      jsonb;
  v_new      jsonb;
begin
  if tg_op = 'DELETE' then
    v_org_id := old.organization_id;
    v_old := to_jsonb(old);
    v_action := 'deleted';
  else
    v_org_id := new.organization_id;
    v_new := to_jsonb(new);
    if tg_op = 'INSERT' then
      v_old := null;
      v_action := 'created';
    else
      v_old := to_jsonb(old);
      -- Infer a more specific action when a `status` column changed.
      if (v_old ->> 'status') is distinct from (v_new ->> 'status') then
        v_action := case new.status::text
          when 'closed' then 'closed'
          when 'approved' then 'approved'
          when 'rejected' then 'rejected'
          when 'submitted' then 'submitted'
          else 'status_changed'
        end::public.audit_action;
      elsif (v_old ->> 'assigned_to') is distinct from (v_new ->> 'assigned_to') then
        v_action := 'assigned';
      else
        v_action := 'updated';
      end if;
    end if;
  end if;

  insert into public.audit_log (organization_id, entity_type, entity_id, action, actor_id, old_value, new_value)
  values (
    v_org_id,
    tg_table_name,
    coalesce(new.id, old.id),
    v_action,
    v_actor,
    v_old,
    v_new
  );

  return coalesce(new, old);
end;
$$;

comment on function public.log_audit() is
  'SECURITY DEFINER trigger function that writes one immutable row to public.audit_log per insert/update/delete. Attach to any table with an organization_id column.';
