create table public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  summary text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table public.program_weeks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  position int not null,
  name text not null,
  phase text not null,
  description text,
  unique (program_id, position)
);

create table public.program_days (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.program_weeks(id) on delete cascade,
  position int not null,
  name text not null,
  kind text not null check (kind in ('lifting', 'court', 'rest', 'comp')),
  notes text,
  unique (week_id, position)
);

create table public.day_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.program_days(id) on delete cascade,
  position int not null,
  exercise_name text not null,
  sets int,
  reps text,
  load text,
  notes text,
  unique (day_id, position)
);

create table public.user_programs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  selected_at timestamptz not null default now()
);

alter table public.programs enable row level security;
alter table public.program_weeks enable row level security;
alter table public.program_days enable row level security;
alter table public.day_exercises enable row level security;
alter table public.user_programs enable row level security;

create policy "programs readable by authenticated"
  on public.programs for select to authenticated using (true);
create policy "weeks readable by authenticated"
  on public.program_weeks for select to authenticated using (true);
create policy "days readable by authenticated"
  on public.program_days for select to authenticated using (true);
create policy "exercises readable by authenticated"
  on public.day_exercises for select to authenticated using (true);

create policy "own user_programs select"
  on public.user_programs for select to authenticated using (user_id = (select auth.uid()));
create policy "own user_programs insert"
  on public.user_programs for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own user_programs update"
  on public.user_programs for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own user_programs delete"
  on public.user_programs for delete to authenticated using (user_id = (select auth.uid()));
