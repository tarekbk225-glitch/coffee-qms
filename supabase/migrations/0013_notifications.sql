-- =============================================================================
-- 0013_notifications.sql
-- In-app notifications foundation. Channel is modeled now (in_app/email/
-- whatsapp/push) so Phase 2 can add real delivery without touching the
-- schema - only public.notification_preferences.channel gets acted on.
-- =============================================================================

create type public.notification_channel as enum ('in_app', 'email', 'whatsapp', 'push');

create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  type            text not null,
  title           text not null,
  title_ar        text,
  body            text,
  body_ar         text,
  entity_type     text,
  entity_id       uuid,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now(),
  read_at         timestamptz
);

create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

create table public.notification_preferences (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  notification_type text not null,
  channel           public.notification_channel not null default 'in_app',
  is_enabled        boolean not null default true,
  unique (user_id, organization_id, notification_type, channel)
);

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

create policy notifications_select on public.notifications
  for select using (user_id = auth.uid());

create policy notifications_update on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notification_preferences_all on public.notification_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------- helpers
create or replace function public.create_notification(
  p_org uuid, p_user uuid, p_type text,
  p_title text, p_title_ar text, p_body text, p_body_ar text,
  p_entity_type text, p_entity_id uuid
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (organization_id, user_id, type, title, title_ar, body, body_ar, entity_type, entity_id)
  values (p_org, p_user, p_type, p_title, p_title_ar, p_body, p_body_ar, p_entity_type, p_entity_id);
$$;

-- Notify every active member holding p_perm (scoped to p_site when set).
create or replace function public.notify_permission_holders(
  p_org uuid, p_site uuid, p_perm text, p_type text,
  p_title text, p_title_ar text, p_body text, p_body_ar text,
  p_entity_type text, p_entity_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  for v_user in
    select distinct m.user_id
    from public.memberships m
    join public.role_permissions rp on rp.role_id = m.role_id
    where m.organization_id = p_org and m.is_active and rp.permission_key = p_perm
      and (p_site is null or m.site_id is null or m.site_id = p_site)
  loop
    perform public.create_notification(p_org, v_user, p_type, p_title, p_title_ar, p_body, p_body_ar, p_entity_type, p_entity_id);
  end loop;
end;
$$;

-- ---------------------------------------------------------------- event triggers
create or replace function public.notify_inspection_assigned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.inspector_id is not null and (tg_op = 'INSERT' or new.inspector_id is distinct from old.inspector_id) then
    perform public.create_notification(
      new.organization_id, new.inspector_id, 'inspection_assigned',
      'New inspection assigned', 'تم تعيين تفتيش جديد لك',
      'You have a new inspection scheduled.', 'لديك تفتيش جديد مجدول.',
      'inspection', new.id
    );
  end if;
  return new;
end;
$$;

create trigger inspections_notify_assigned
  after insert or update on public.inspections
  for each row execute function public.notify_inspection_assigned();

create or replace function public.notify_critical_finding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.severity = 'critical' then
    perform public.notify_permission_holders(
      new.organization_id, new.site_id, 'finding.manage', 'critical_finding',
      'Critical finding raised: ' || new.finding_number, 'تم رفع ملاحظة حرجة: ' || new.finding_number,
      new.description, new.description,
      'finding', new.id
    );
  end if;
  if new.assigned_to is not null then
    perform public.create_notification(
      new.organization_id, new.assigned_to, 'finding_assigned',
      'Finding assigned: ' || new.finding_number, 'تم تعيين ملاحظة لك: ' || new.finding_number,
      new.description, new.description, 'finding', new.id
    );
  end if;
  return new;
end;
$$;

create trigger findings_notify
  after insert on public.findings
  for each row execute function public.notify_critical_finding();

create or replace function public.notify_capa_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_to is not null and (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to) then
    perform public.create_notification(
      new.organization_id, new.assigned_to, 'capa_assigned',
      'CAPA assigned: ' || new.capa_number, 'تم تعيين إجراء تصحيحي/وقائي لك: ' || new.capa_number,
      new.required_action, new.required_action, 'capa', new.id
    );
  end if;
  if tg_op = 'UPDATE' and new.status = 'rejected' and old.status is distinct from new.status and new.assigned_to is not null then
    perform public.create_notification(
      new.organization_id, new.assigned_to, 'capa_rejected',
      'CAPA rejected: ' || new.capa_number, 'تم رفض الإجراء: ' || new.capa_number,
      new.rejected_reason, new.rejected_reason, 'capa', new.id
    );
  end if;
  return new;
end;
$$;

create trigger capas_notify
  after insert or update on public.capas
  for each row execute function public.notify_capa_events();

-- Future cron-invoked function for time-based reminders (inspection overdue,
-- CAPA near-due/overdue, maintenance/calibration due once those modules
-- exist). Left as a documented, callable stub for Phase 2 scheduling.
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

  return v_count;
end;
$$;
