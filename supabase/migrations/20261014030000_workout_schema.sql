-- Sync plumbing (handle_times trigger) + exercises library + workout logging
-- tables (workouts, workout_exercises, workout_sets) + day_exercises.exercise_id
-- link column. See docs/superpowers/specs/2026-10-14-workout-logging-design.md
-- for the schema this transcribes.

create or replace function public.handle_times()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();
  elsif tg_op = 'UPDATE' then
    new.created_at := old.created_at;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- ============================================================
-- exercises — the library
-- ============================================================
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  muscle_group text not null,
  equipment text not null,
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

-- global rows (owner_id null) must have unique names; users may name their
-- own custom exercises freely, including reusing a global name.
create unique index exercises_global_name_key
  on public.exercises (name)
  where owner_id is null;

create trigger exercises_handle_times
  before insert or update on public.exercises
  for each row execute function public.handle_times();

alter table public.exercises enable row level security;

create policy "exercises select global or own"
  on public.exercises for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));

create policy "exercises insert own"
  on public.exercises for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "exercises update own"
  on public.exercises for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- ============================================================
-- day_exercises.exercise_id — link programme rows to the library
-- ============================================================
alter table public.day_exercises
  add column exercise_id uuid references public.exercises(id);

-- ============================================================
-- workouts
-- ============================================================
create table public.workouts (
  id uuid primary key, -- client-generated, no default (offline create)
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  program_day_id uuid references public.program_days(id) on delete set null,
  started_at timestamptz not null,
  finished_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create trigger workouts_handle_times
  before insert or update on public.workouts
  for each row execute function public.handle_times();

alter table public.workouts enable row level security;

create policy "workouts select own"
  on public.workouts for select to authenticated
  using (user_id = (select auth.uid()));

create policy "workouts insert own"
  on public.workouts for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "workouts update own"
  on public.workouts for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "workouts delete own"
  on public.workouts for delete to authenticated
  using (user_id = (select auth.uid()));

-- ============================================================
-- workout_exercises
-- ============================================================
create table public.workout_exercises (
  id uuid primary key, -- client-generated, no default
  user_id uuid not null references auth.users(id) on delete cascade, -- denormalized for RLS/sync
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid references public.exercises(id),
  exercise_name text not null, -- snapshot at log time
  position int not null,
  rest_seconds int,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create trigger workout_exercises_handle_times
  before insert or update on public.workout_exercises
  for each row execute function public.handle_times();

alter table public.workout_exercises enable row level security;

create policy "workout_exercises select own"
  on public.workout_exercises for select to authenticated
  using (user_id = (select auth.uid()));

create policy "workout_exercises insert own"
  on public.workout_exercises for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "workout_exercises update own"
  on public.workout_exercises for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "workout_exercises delete own"
  on public.workout_exercises for delete to authenticated
  using (user_id = (select auth.uid()));

-- ============================================================
-- workout_sets
-- ============================================================
create table public.workout_sets (
  id uuid primary key, -- client-generated, no default
  user_id uuid not null references auth.users(id) on delete cascade, -- denormalized
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  position int not null,
  set_type text not null check (set_type in ('warmup', 'working', 'drop', 'failure')) default 'working',
  weight_kg numeric,
  reps int,
  duration_seconds int,
  target text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create trigger workout_sets_handle_times
  before insert or update on public.workout_sets
  for each row execute function public.handle_times();

alter table public.workout_sets enable row level security;

create policy "workout_sets select own"
  on public.workout_sets for select to authenticated
  using (user_id = (select auth.uid()));

create policy "workout_sets insert own"
  on public.workout_sets for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "workout_sets update own"
  on public.workout_sets for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "workout_sets delete own"
  on public.workout_sets for delete to authenticated
  using (user_id = (select auth.uid()));
