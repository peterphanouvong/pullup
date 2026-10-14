-- "Today" mapping needs a per-user anchor date: the Monday of the week the
-- user selected their programme, so currentProgramPosition() can derive
-- week/day from calendar dates alone (see src/features/programs/schedule.ts).
alter table public.user_programs add column start_date date;

-- Backfill existing rows to the Monday of their selected_at week (ISO week
-- truncation, which starts on Monday).
update public.user_programs
set start_date = (date_trunc('week', selected_at at time zone 'utc'))::date
where start_date is null;
