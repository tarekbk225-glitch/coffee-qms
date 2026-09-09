-- =============================================================================
-- 0001_extensions_and_helpers.sql
-- Extensions and shared trigger helper functions used across every module.
-- =============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "citext";        -- case-insensitive text (emails, codes)

-- -----------------------------------------------------------------------------
-- Generic updated_at maintenance trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Generic BEFORE UPDATE trigger that stamps updated_at = now() on every row change.';
