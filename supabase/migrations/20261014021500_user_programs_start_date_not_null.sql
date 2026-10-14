-- Backfill (20261014020716_user_programs_start_date.sql) has run, so every
-- row now has a start_date. Enforce the invariant the app relies on: a null
-- start_date would crash Today's parseYMD, so close the column off from ever
-- going null again.
alter table public.user_programs alter column start_date set not null;
