# Coffee Factory Quality & Operations Management System

A production-grade Quality / Food Safety / Operations management system built for a coffee
factory, architected so its foundation (organizations, sites, RBAC, audit trail, checklist
templates, findings, CAPA) can later grow into a general manufacturing QMS without a rewrite.

This is **not** a clone of any commercial product (uAuditor and similar tools were only used
as loose conceptual inspiration). It is a purpose-built application around one real,
end-to-end workflow:

```
Inspection -> Finding -> Non-Conformity -> Corrective Action -> Assigned Employee
  -> Due Date -> Evidence -> Verification -> Approval -> Closure -> Analytics
```

The UI is Arabic-first (RTL), with the architecture (bilingual label maps, `Intl`-based
formatting) already in place to add English later without restructuring anything.

## Tech stack

- **Next.js 16** (App Router, Turbopack, Server Actions) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + hand-written shadcn/ui-style components (Radix UI primitives + `cva`)
- **Supabase**: Postgres, Auth, Storage (private buckets + signed URLs), Realtime, and
  **Row Level Security as the actual security boundary** (never just hidden buttons)
- `@fontsource/ibm-plex-sans-arabic` (self-hosted Arabic font)
- `recharts` for the dashboard's analytics charts

## What's built (Phase 1)

Foundation: multi-tenant organizations, sites, departments, areas, teams, 11 built-in roles
with a granular, database-enforced permission model, full audit trail, evidence file storage,
notifications (in-app + Realtime bell, with email/WhatsApp/push wired up as a later phase).

Modules: **Dashboard** (KPIs + charts) · **Checklist Template Builder** (16 question types,
versioning, draft/review/approve/publish workflow) · **Inspections** (scheduling, one-section-
at-a-time mobile execution, autosave, auto-graded pass/fail, auto-generated Findings on fail) ·
**Findings** (with inline "create CAPA without leaving the page" UX) · **CAPA** (the full
7-state workflow, structured 5-Whys + Fishbone root cause analysis) · **Asset Registry**
(equipment with QR codes, ready for a future maintenance module) · **Audit Trail viewer** ·
**Settings** (organization, sites, departments, users & roles).

Everything not listed above (batch/lot traceability, maintenance work orders, pest control,
supplier quality, document control, WhatsApp/email/push notifications, conditional
question-logic execution, English UI) has its database groundwork already in place (columns,
enums, or clearly reserved extension points) but is intentionally not built out yet - see
"Future phases" below. Nothing in the UI pretends to do something it doesn't: an unbuilt
action is either absent or clearly marked as a future step.

## Getting started

### 1. Create a Supabase project

Create a new project at [supabase.com](https://supabase.com) (or point at a self-hosted
instance). You'll need its Project URL and anon/public API key (Project Settings -> API).

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from step 1.

### 3. Run the migrations

Every file in `supabase/migrations/` is a plain, ordered `.sql` file - no Supabase CLI
required. Apply them in order against your project's database, e.g. via the Supabase
Studio SQL editor (paste each file's contents in order `0001` -> `0014`) or:

```bash
for f in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

(`$DATABASE_URL` is the Postgres connection string from Project Settings -> Database.)

This creates every table, enum, index, trigger, RLS policy, and the `evidence` Storage
bucket. It does **not** create any demo data - that's a separate, explicit step.

### 4. (Optional) Seed demo data

`supabase/seed.sql` is kept deliberately separate from the migrations above so demo data is
never mixed into a production database. It creates:

- 7 demo users (one per key role) - **password `Demo@12345` for all of them**
- Organization "Demo Coffee Factory" / "مصنع القهوة التجريبي" with one site ("Main Factory")
- 4 departments: Quality, Production, Warehouse, Maintenance
- 5 real checklist templates (with sections and questions), 4 published + 1 left as Draft
  on purpose, so you can see both states immediately

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed.sql
```

Demo logins (all `Demo@12345`):

| Email | Role |
|---|---|
| `admin@demo.coffee` | Super Admin |
| `quality.manager@demo.coffee` | Quality Manager |
| `inspector@demo.coffee` | Quality Inspector |
| `production.manager@demo.coffee` | Production Manager |
| `warehouse.manager@demo.coffee` | Warehouse Manager |
| `maintenance.manager@demo.coffee` | Maintenance Manager |
| `employee@demo.coffee` | Employee |

Read the caveat comment at the top of `supabase/seed.sql` before running it: it inserts
demo `auth.users` rows directly (a common, but not officially documented, way to seed
Supabase Auth users outside the normal sign-up/Admin-API flow). Never run it against a
production project.

Seed script is idempotent - re-running it will not create duplicates.

### 5. Install dependencies and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If you skipped seeding, sign up for a
new account from the app itself - the onboarding flow creates your organization and site for
you.

### 6. Deploy

Any Next.js host works (Vercel is the simplest). Set the same two environment variables
there, point it at your Supabase project, and deploy.

## Architecture notes

- **RLS + trigger-level authorization (defense in depth).** RLS policies grant coarse
  row-level access ("can this user see/touch this row at all"); PL/pgSQL trigger functions
  (`*_validate_transition()` on templates/inspections/findings/CAPAs) additionally check
  *which specific status transition* is being attempted and *who* is allowed to make it.
  Both layers were adversarially tested (see "Testing" below) - a user who only holds
  `quality.execute`-level permissions cannot, for example, push a CAPA into `verification`
  even though RLS alone would have let the row-level UPDATE through.
- **Immutable audit trail.** Every significant table has a generic `log_audit()` trigger
  writing to `public.audit_log`. No application role has INSERT/UPDATE/DELETE on that table -
  only the trigger can write to it, and there is no "delete" path for audit rows at all.
- **Evidence files never touch the database as blobs.** Photos/videos/attachments/signatures
  go straight from the browser to a private Supabase Storage bucket; only a signed URL and a
  metadata row (`evidence_files`) - with organization/site re-derived and verified
  server-side from the real parent record, never trusted from the client - ever reach
  Postgres.
- **Server-side authorization only.** Every permission check that matters is re-verified in
  the database (RLS + triggers). The UI reads the same permission set to decide what to show,
  but hiding a button is a UX nicety here, not the security boundary.
- **Seed data lives outside migrations on purpose** (see step 4) so a production deploy can
  never accidentally end up with demo accounts in it.

## Future phases (deliberately not built now)

The database already reserves room for these; building them out is future work, not a
missing afterthought:

- Bidirectional lot/batch traceability across the full production process (Raw Coffee
  Receiving -> Inspection -> Warehouse -> Roasting -> Cooling -> Grinding -> WIP -> Packing ->
  Finished Product QC -> Finished Goods Warehouse -> Dispatch)
- Equipment maintenance work orders, calibration schedules, and QR-code scan-to-report
  (the Asset Registry's QR codes are already live and ready to link into this)
- Cleaning & sanitation schedules, pest control logs, supplier quality scorecards
- Document control (versioned SOPs/policies beyond checklist templates)
- Conditional question logic inside a template (the `condition` column already exists on
  `template_questions`; the execution engine for it does not yet)
- Outbound notifications over email/WhatsApp/push (the `notifications` table and
  per-channel `notification_preferences` already model this; only in-app + Realtime deliver
  today)
- English UI (every label is already bilingual in `src/lib/labels.ts` - switching the active
  locale is a matter of reading the other key, not restructuring components)

## Project structure

```
src/app/(auth)/            sign in / sign up
src/app/onboarding/        first-run "create your organization" flow
src/app/(app)/             the app shell + every Phase 1 module
  dashboard/  templates/  inspections/  findings/  capas/  assets/  audit/  settings/
src/components/ui/         hand-written shadcn-equivalent primitives (Radix + cva)
src/components/layout/     app shell, sidebar, topbar, notification bell
src/components/shared/     page header, empty state, status badge, evidence uploader, signature pad
src/lib/                   supabase clients, session/permissions, labels, formatting
src/types/database.ts      hand-authored types mirroring the SQL schema (see note in the file
                           on regenerating these with `supabase gen types` against a live project)
supabase/migrations/       the real, ordered schema - safe to run against a fresh project
supabase/seed.sql          optional demo data (see step 4) - never applied automatically
```

## Testing performed

Every migration was applied against a real, disposable Postgres 16 database and verified
with two end-to-end SQL scripts (not shipped - this was local-only verification during
development): a full happy-path run of the exact workflow this system is built around
(template -> publish -> schedule -> inspect -> fail an item -> auto-Finding -> inline CAPA ->
assign -> complete -> verify -> close -> audit trail -> dashboard numbers), and an
adversarial security run proving cross-organization row isolation and that each CAPA/
Finding/Inspection/Template status transition is blocked for an actor who lacks the specific
permission it requires, even though that actor can otherwise see/edit the row.

The application itself passes a full `next build` with TypeScript strict-mode and ESLint
both clean (zero errors, zero warnings) across every route.
