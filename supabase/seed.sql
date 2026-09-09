-- =============================================================================
-- supabase/seed.sql
--
-- DEV / DEMO SEED DATA ONLY. This is intentionally kept OUT of
-- supabase/migrations/ so it is never applied automatically to a production
-- project. Run it by hand, once, against a project that has already had
-- every file in supabase/migrations/ applied:
--
--   psql "$DATABASE_URL" -f supabase/seed.sql
--
-- ...or paste its contents into the Supabase Studio SQL editor.
--
-- What this creates:
--   - 7 demo auth users (one per key role), password: Demo@12345
--   - Organization "Demo Coffee Factory" / "مصنع القهوة التجريبي"
--   - Site "Main Factory" / "المصنع الرئيسي"
--   - 4 departments: Quality, Production, Warehouse, Maintenance
--   - Memberships linking every demo user to the org with the right role
--   - 5 named checklist templates (with real sections/questions), matching
--     the coffee production process this system is modeled around
--
-- CAVEAT on the demo users: inserting directly into auth.users bypasses
-- Supabase's normal signup / Admin API flow. This is a widely used community
-- technique for seeding local/dev projects (Supabase's own auth.users schema
-- is stable enough for it), but it is NOT an officially documented public
-- API. Do not run this against a production project, and if a future
-- Supabase auth schema change ever breaks the INSERT below, create the demo
-- users the normal way instead (sign-up page or the Auth Admin API) and only
-- run the second half of this script (organization/site/departments/
-- templates), replacing the `select id from auth.users where email = ...`
-- lookups with the real ids.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Demo auth users (idempotent: skips any email that already exists)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('admin@demo.coffee',              'مدير عام النظام - تجريبي'),
      ('quality.manager@demo.coffee',    'مدير الجودة - تجريبي'),
      ('inspector@demo.coffee',          'مفتش الجودة - تجريبي'),
      ('production.manager@demo.coffee', 'مدير الإنتاج - تجريبي'),
      ('warehouse.manager@demo.coffee',  'مدير المستودع - تجريبي'),
      ('maintenance.manager@demo.coffee','مدير الصيانة - تجريبي'),
      ('employee@demo.coffee',           'موظف الإنتاج - تجريبي')
    ) as t(email, full_name_ar)
  loop
    if not exists (select 1 from auth.users where email = r.email) then
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
        r.email, crypt('Demo@12345', gen_salt('bf')),
        now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', r.full_name_ar),
        now(), now(),
        '', '', '', ''
      );
    end if;
  end loop;
end $$;

-- The on_auth_user_created trigger (0004_users_roles_permissions.sql) already
-- created a public.profiles row per user from raw_user_meta_data ->> 'full_name'.
-- Fill in full_name_ar/locale too (the trigger only sets full_name/email).
update public.profiles p
set full_name_ar = coalesce(p.full_name_ar, p.full_name), locale = 'ar'
where p.email in (
  'admin@demo.coffee', 'quality.manager@demo.coffee', 'inspector@demo.coffee',
  'production.manager@demo.coffee', 'warehouse.manager@demo.coffee',
  'maintenance.manager@demo.coffee', 'employee@demo.coffee'
);

-- ---------------------------------------------------------------------------
-- 2. Organization, site, departments
-- ---------------------------------------------------------------------------
do $$
declare
  v_admin_id       uuid := (select id from auth.users where email = 'admin@demo.coffee');
  v_quality_mgr_id uuid := (select id from auth.users where email = 'quality.manager@demo.coffee');
  v_inspector_id   uuid := (select id from auth.users where email = 'inspector@demo.coffee');
  v_prod_mgr_id    uuid := (select id from auth.users where email = 'production.manager@demo.coffee');
  v_wh_mgr_id      uuid := (select id from auth.users where email = 'warehouse.manager@demo.coffee');
  v_maint_mgr_id   uuid := (select id from auth.users where email = 'maintenance.manager@demo.coffee');
  v_employee_id    uuid := (select id from auth.users where email = 'employee@demo.coffee');

  v_org_id    uuid;
  v_site_id   uuid;
  v_dept_quality     uuid;
  v_dept_production  uuid;
  v_dept_warehouse   uuid;
  v_dept_maintenance uuid;

  v_role_super_admin        uuid := (select id from public.roles where key = 'super_admin');
  v_role_quality_manager    uuid := (select id from public.roles where key = 'quality_manager');
  v_role_quality_inspector  uuid := (select id from public.roles where key = 'quality_inspector');
  v_role_production_manager uuid := (select id from public.roles where key = 'production_manager');
  v_role_warehouse_manager  uuid := (select id from public.roles where key = 'warehouse_manager');
  v_role_maintenance_manager uuid := (select id from public.roles where key = 'maintenance_manager');
  v_role_employee           uuid := (select id from public.roles where key = 'employee');
begin
  select id into v_org_id from public.organizations where slug = 'demo-coffee-factory';
  if v_org_id is null then
    insert into public.organizations (name, name_ar, slug, created_by)
    values ('Demo Coffee Factory', 'مصنع القهوة التجريبي', 'demo-coffee-factory', v_admin_id)
    returning id into v_org_id;
  end if;

  select id into v_site_id from public.sites where organization_id = v_org_id and code = 'MAIN';
  if v_site_id is null then
    insert into public.sites (organization_id, name, name_ar, code, type, city, created_by)
    values (v_org_id, 'Main Factory', 'المصنع الرئيسي', 'MAIN', 'factory', 'Riyadh', v_admin_id)
    returning id into v_site_id;
  end if;

  select id into v_dept_quality from public.departments where site_id = v_site_id and name_ar = 'الجودة';
  if v_dept_quality is null then
    insert into public.departments (organization_id, site_id, name, name_ar, code, created_by)
    values (v_org_id, v_site_id, 'Quality', 'الجودة', 'QA', v_admin_id) returning id into v_dept_quality;
  end if;

  select id into v_dept_production from public.departments where site_id = v_site_id and name_ar = 'الإنتاج';
  if v_dept_production is null then
    insert into public.departments (organization_id, site_id, name, name_ar, code, created_by)
    values (v_org_id, v_site_id, 'Production', 'الإنتاج', 'PROD', v_admin_id) returning id into v_dept_production;
  end if;

  select id into v_dept_warehouse from public.departments where site_id = v_site_id and name_ar = 'المستودعات';
  if v_dept_warehouse is null then
    insert into public.departments (organization_id, site_id, name, name_ar, code, created_by)
    values (v_org_id, v_site_id, 'Warehouse', 'المستودعات', 'WH', v_admin_id) returning id into v_dept_warehouse;
  end if;

  select id into v_dept_maintenance from public.departments where site_id = v_site_id and name_ar = 'الصيانة';
  if v_dept_maintenance is null then
    insert into public.departments (organization_id, site_id, name, name_ar, code, created_by)
    values (v_org_id, v_site_id, 'Maintenance', 'الصيانة', 'MNT', v_admin_id) returning id into v_dept_maintenance;
  end if;

  -- Memberships: super_admin/quality_manager/production_manager are
  -- org-wide (site_id null = every site); the rest are scoped to Main Factory.
  insert into public.memberships (organization_id, user_id, role_id, site_id, department_id, invited_by)
  values
    (v_org_id, v_admin_id,        v_role_super_admin,         null,      null,               v_admin_id),
    (v_org_id, v_quality_mgr_id,  v_role_quality_manager,     null,      v_dept_quality,      v_admin_id),
    (v_org_id, v_inspector_id,    v_role_quality_inspector,   v_site_id, v_dept_quality,      v_admin_id),
    (v_org_id, v_prod_mgr_id,     v_role_production_manager,  null,      v_dept_production,   v_admin_id),
    (v_org_id, v_wh_mgr_id,       v_role_warehouse_manager,   v_site_id, v_dept_warehouse,    v_admin_id),
    (v_org_id, v_maint_mgr_id,    v_role_maintenance_manager, v_site_id, v_dept_maintenance,  v_admin_id),
    (v_org_id, v_employee_id,     v_role_employee,            v_site_id, v_dept_production,   v_admin_id)
  on conflict do nothing;

  -- Impersonate the super_admin (who holds every permission) for the rest of
  -- this transaction, so the templates' own trigger-level authorization
  -- checks (templates_validate_transition, template_structure_locked) see a
  -- real, permitted actor via auth.uid() - exactly as they would for a
  -- logged-in user, rather than special-casing "skip checks when seeding".
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_admin_id::text, 'role', 'authenticated')::text,
    true
  );

  -- -------------------------------------------------------------------------
  -- 3. Five sample checklist templates, each with real sections/questions.
  -- Inserted as 'draft' (required - template_structure_locked() only allows
  -- editing sections/questions while draft/under_review), then published
  -- afterward except one left as draft on purpose to demo that status too.
  -- -------------------------------------------------------------------------
  declare
    v_tpl_id uuid;
    v_sec_id uuid;
  begin
    -- Template 1: Daily Production Hygiene Inspection
    if not exists (select 1 from public.templates where organization_id = v_org_id and code = 'TPL-HYGIENE-DAILY') then
      insert into public.templates (organization_id, code, name, name_ar, category, department_id, description, owner_id, created_by)
      values (v_org_id, 'TPL-HYGIENE-DAILY', 'Daily Production Hygiene Inspection', 'تفتيش النظافة اليومي للإنتاج',
              'hygiene', v_dept_production, 'فحص يومي لنظافة العاملين والمعدات في خط الإنتاج.', v_quality_mgr_id, v_admin_id)
      returning id into v_tpl_id;

      insert into public.template_sections (organization_id, template_id, title, title_ar, sort_order)
      values (v_org_id, v_tpl_id, 'Personal Hygiene', 'النظافة الشخصية', 1) returning id into v_sec_id;
      insert into public.template_questions (organization_id, template_id, section_id, sort_order, prompt, prompt_ar, type, is_critical, polarity, require_photo_on_fail)
      values
        (v_org_id, v_tpl_id, v_sec_id, 1, 'Is the worker wearing a clean uniform and hairnet?', 'هل يرتدي العامل زيًا نظيفًا وغطاء رأس؟', 'yes_no', true, 'positive', true),
        (v_org_id, v_tpl_id, v_sec_id, 2, 'Are hands washed/sanitized before handling product?', 'هل تم غسل/تعقيم اليدين قبل التعامل مع المنتج؟', 'yes_no', true, 'positive', false);

      insert into public.template_sections (organization_id, template_id, title, title_ar, sort_order)
      values (v_org_id, v_tpl_id, 'Equipment Cleanliness', 'نظافة المعدات', 2) returning id into v_sec_id;
      insert into public.template_questions (organization_id, template_id, section_id, sort_order, prompt, prompt_ar, type, is_critical, require_photo_on_fail)
      values
        (v_org_id, v_tpl_id, v_sec_id, 1, 'Production line surfaces are clean and sanitized', 'أسطح خط الإنتاج نظيفة ومعقّمة', 'pass_fail', false, true),
        (v_org_id, v_tpl_id, v_sec_id, 2, 'Photo of the cleaned line', 'صورة لخط الإنتاج بعد التنظيف', 'photo', false, false);

      update public.templates set status = 'under_review' where id = v_tpl_id;
      update public.templates set status = 'approved' where id = v_tpl_id;
      update public.templates set status = 'published' where id = v_tpl_id;
    end if;

    -- Template 2: Raw Coffee Receiving Inspection
    if not exists (select 1 from public.templates where organization_id = v_org_id and code = 'TPL-RECEIVING') then
      insert into public.templates (organization_id, code, name, name_ar, category, department_id, description, owner_id, created_by)
      values (v_org_id, 'TPL-RECEIVING', 'Raw Coffee Receiving Inspection', 'تفتيش استلام القهوة الخام',
              'receiving', v_dept_quality, 'فحص شحنات القهوة الخضراء عند الاستلام قبل نقلها للمستودع.', v_quality_mgr_id, v_admin_id)
      returning id into v_tpl_id;

      insert into public.template_sections (organization_id, template_id, title, title_ar, sort_order)
      values (v_org_id, v_tpl_id, 'Shipment Inspection', 'فحص الشحنة', 1) returning id into v_sec_id;
      insert into public.template_questions (organization_id, template_id, section_id, sort_order, prompt, prompt_ar, type, is_critical, min_value, max_value, unit)
      values (v_org_id, v_tpl_id, v_sec_id, 1, 'Moisture content (%)', 'نسبة الرطوبة (%)', 'number', true, 8, 12.5, '%');
      insert into public.template_questions (organization_id, template_id, section_id, sort_order, prompt, prompt_ar, type, is_critical, polarity, require_photo_on_fail)
      values (v_org_id, v_tpl_id, v_sec_id, 2, 'Packaging intact, no visible damage or pests', 'التغليف سليم، بدون تلف أو آفات ظاهرة', 'yes_no', true, 'positive', true);

      insert into public.template_sections (organization_id, template_id, title, title_ar, sort_order)
      values (v_org_id, v_tpl_id, 'Documentation', 'التحقق من المستندات', 2) returning id into v_sec_id;
      insert into public.template_questions (organization_id, template_id, section_id, sort_order, prompt, prompt_ar, type, polarity)
      values (v_org_id, v_tpl_id, v_sec_id, 1, 'Certificate of origin / quality matches the shipment', 'شهادة المنشأ / الجودة مطابقة للشحنة', 'yes_no', 'positive');

      update public.templates set status = 'under_review' where id = v_tpl_id;
      update public.templates set status = 'approved' where id = v_tpl_id;
      update public.templates set status = 'published' where id = v_tpl_id;
    end if;

    -- Template 3: Roaster Pre-Operation Inspection
    if not exists (select 1 from public.templates where organization_id = v_org_id and code = 'TPL-ROASTER-PREOP') then
      insert into public.templates (organization_id, code, name, name_ar, category, department_id, description, owner_id, created_by)
      values (v_org_id, 'TPL-ROASTER-PREOP', 'Roaster Pre-Operation Inspection', 'تفتيش ما قبل تشغيل المحمصة',
              'roasting', v_dept_maintenance, 'فحص سلامة المحمصة وقراءاتها قبل بدء التشغيل اليومي.', v_quality_mgr_id, v_admin_id)
      returning id into v_tpl_id;

      insert into public.template_sections (organization_id, template_id, title, title_ar, sort_order)
      values (v_org_id, v_tpl_id, 'Safety Checks', 'فحص السلامة', 1) returning id into v_sec_id;
      insert into public.template_questions (organization_id, template_id, section_id, sort_order, prompt, prompt_ar, type, is_critical, polarity)
      values
        (v_org_id, v_tpl_id, v_sec_id, 1, 'Emergency stop button tested and working', 'زر الطوارئ تم اختباره ويعمل', 'yes_no', true, 'positive'),
        (v_org_id, v_tpl_id, v_sec_id, 2, 'Exhaust and cyclone free of obstruction', 'مخرج العادم والسيكلون خاليان من الانسداد', 'yes_no', true, 'positive');

      insert into public.template_sections (organization_id, template_id, title, title_ar, sort_order)
      values (v_org_id, v_tpl_id, 'Roaster Readings', 'قراءات المحمصة', 2) returning id into v_sec_id;
      insert into public.template_questions (organization_id, template_id, section_id, sort_order, prompt, prompt_ar, type, min_value, max_value, unit)
      values (v_org_id, v_tpl_id, v_sec_id, 1, 'Drum temperature at idle', 'حرارة الأسطوانة عند التوقف', 'temperature', 0, 60, '°C');

      update public.templates set status = 'under_review' where id = v_tpl_id;
      update public.templates set status = 'approved' where id = v_tpl_id;
      update public.templates set status = 'published' where id = v_tpl_id;
    end if;

    -- Template 4: Packing Line Quality Inspection (left as Draft on purpose)
    if not exists (select 1 from public.templates where organization_id = v_org_id and code = 'TPL-PACKING') then
      insert into public.templates (organization_id, code, name, name_ar, category, department_id, description, owner_id, created_by)
      values (v_org_id, 'TPL-PACKING', 'Packing Line Quality Inspection', 'تفتيش جودة خط التعبئة',
              'packing', v_dept_production, 'فحص جودة التعبئة والوزن والتسمية على خط التعبئة.', v_quality_mgr_id, v_admin_id)
      returning id into v_tpl_id;

      insert into public.template_sections (organization_id, template_id, title, title_ar, sort_order)
      values (v_org_id, v_tpl_id, 'Seal & Packaging', 'فحص التعبئة', 1) returning id into v_sec_id;
      insert into public.template_questions (organization_id, template_id, section_id, sort_order, prompt, prompt_ar, type, is_critical, require_photo_on_fail)
      values (v_org_id, v_tpl_id, v_sec_id, 1, 'Bag seal is complete and airtight', 'لحام الكيس كامل ومحكم', 'pass_fail', true, true);

      insert into public.template_sections (organization_id, template_id, title, title_ar, sort_order)
      values (v_org_id, v_tpl_id, 'Weight & Labeling', 'الوزن والتسمية', 2) returning id into v_sec_id;
      insert into public.template_questions (organization_id, template_id, section_id, sort_order, prompt, prompt_ar, type, min_value, max_value, unit)
      values (v_org_id, v_tpl_id, v_sec_id, 1, 'Net weight', 'الوزن الصافي', 'number', 248, 252, 'g');
      insert into public.template_questions (organization_id, template_id, section_id, sort_order, prompt, prompt_ar, type, polarity)
      values (v_org_id, v_tpl_id, v_sec_id, 2, 'Label matches product, batch and expiry date', 'الملصق مطابق للمنتج ورقم الدفعة وتاريخ الانتهاء', 'yes_no', 'positive');
      -- (status intentionally left as 'draft' - not every template needs to be
      -- published for the seed to demonstrate the template lifecycle)
    end if;

    -- Template 5: Warehouse GMP Inspection
    if not exists (select 1 from public.templates where organization_id = v_org_id and code = 'TPL-WAREHOUSE-GMP') then
      insert into public.templates (organization_id, code, name, name_ar, category, department_id, description, owner_id, created_by)
      values (v_org_id, 'TPL-WAREHOUSE-GMP', 'Warehouse GMP Inspection', 'تفتيش الممارسات الجيدة للتصنيع بالمستودع',
              'warehouse', v_dept_warehouse, 'فحص شروط التخزين ومكافحة الآفات في المستودع.', v_quality_mgr_id, v_admin_id)
      returning id into v_tpl_id;

      insert into public.template_sections (organization_id, template_id, title, title_ar, sort_order)
      values (v_org_id, v_tpl_id, 'Storage Conditions', 'التخزين', 1) returning id into v_sec_id;
      insert into public.template_questions (organization_id, template_id, section_id, sort_order, prompt, prompt_ar, type, polarity)
      values
        (v_org_id, v_tpl_id, v_sec_id, 1, 'Pallets stored off the floor and away from walls', 'المنصات مخزنة بعيدًا عن الأرض والجدران', 'yes_no', 'positive'),
        (v_org_id, v_tpl_id, v_sec_id, 2, 'FIFO rotation labels visible and followed', 'ملصقات دوران FIFO ظاهرة ومتبعة', 'yes_no', 'positive');

      insert into public.template_sections (organization_id, template_id, title, title_ar, sort_order)
      values (v_org_id, v_tpl_id, 'Pest Control', 'مكافحة الآفات', 2) returning id into v_sec_id;
      insert into public.template_questions (organization_id, template_id, section_id, sort_order, prompt, prompt_ar, type, is_critical, require_photo_on_fail)
      values (v_org_id, v_tpl_id, v_sec_id, 1, 'Bait stations intact and free of activity', 'محطات الطعم سليمة وخالية من أي نشاط', 'pass_fail', true, true);

      update public.templates set status = 'under_review' where id = v_tpl_id;
      update public.templates set status = 'approved' where id = v_tpl_id;
      update public.templates set status = 'published' where id = v_tpl_id;
    end if;
  end;
end $$;

commit;

-- ---------------------------------------------------------------------------
-- Demo login credentials (dev/demo only - never reuse in production):
--   admin@demo.coffee               / Demo@12345   (super_admin)
--   quality.manager@demo.coffee     / Demo@12345   (quality_manager)
--   inspector@demo.coffee           / Demo@12345   (quality_inspector)
--   production.manager@demo.coffee  / Demo@12345   (production_manager)
--   warehouse.manager@demo.coffee   / Demo@12345   (warehouse_manager)
--   maintenance.manager@demo.coffee / Demo@12345   (maintenance_manager)
--   employee@demo.coffee            / Demo@12345   (employee)
-- ---------------------------------------------------------------------------
