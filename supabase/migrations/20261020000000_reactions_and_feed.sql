-- Check-ins and reactions.
--
-- A check-in isn't a row of its own: it's a finished workout, seen through
-- crew_feed(), which gives crewmates the programme day's name, the duration
-- and the set count — never the title, the weights or the notes. A workout
-- off the programme shows as just "a workout".
--
-- A reaction is one preset emoji per person per workout; sending another
-- replaces it. No free text anywhere.

create table public.workout_reactions (
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (emoji in ('🔥', '💪', '👏')),
  created_at timestamptz not null default now(),
  primary key (workout_id, user_id)
);

alter table public.workout_reactions enable row level security;

-- Whether the caller may see (and so react to) a workout: their own, or a
-- crewmate's finished one. Security definer because workouts' own RLS only
-- shows the caller their own rows.
create or replace function public.can_react_to(p_workout_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workouts w
    where w.id = p_workout_id
      and w.finished_at is not null
      and not w.deleted
      and (w.user_id = (select auth.uid()) or public.shares_crew_with(w.user_id))
  );
$$;

create policy "reactions readable where the workout is"
  on public.workout_reactions for select to authenticated
  using (public.can_react_to(workout_id));
create policy "own reaction insert"
  on public.workout_reactions for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_react_to(workout_id));
create policy "own reaction update"
  on public.workout_reactions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.can_react_to(workout_id));
create policy "own reaction delete"
  on public.workout_reactions for delete to authenticated
  using (user_id = (select auth.uid()));

-- Guests can't react: a reaction carries a name.
create or replace function public.set_reaction(p_workout_id uuid, p_emoji text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_permanent_account();
begin
  if not public.can_react_to(p_workout_id) then
    raise exception 'not a crewmate''s workout' using errcode = '42501';
  end if;
  if p_emoji is null then
    delete from public.workout_reactions where workout_id = p_workout_id and user_id = uid;
  else
    insert into public.workout_reactions (workout_id, user_id, emoji)
    values (p_workout_id, uid, p_emoji)
    on conflict (workout_id, user_id) do update set emoji = excluded.emoji, created_at = now();
  end if;
end;
$$;

-- The crew's finished sessions in [p_from, p_to), newest first, each with
-- its reactions. `day_name` is the programme day's name (null off-plan).
create or replace function public.crew_feed(p_crew_id uuid, p_from timestamptz, p_to timestamptz)
returns table (
  workout_id uuid,
  user_id uuid,
  display_name text,
  day_name text,
  started_at timestamptz,
  finished_at timestamptz,
  completed_sets int,
  reactions jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_crew_member(p_crew_id) then
    raise exception 'not a member of this crew' using errcode = '42501';
  end if;

  return query
  select
    w.id,
    w.user_id,
    coalesce(p.display_name, 'Crewmate'),
    d.name,
    w.started_at,
    w.finished_at,
    (
      select count(*)::int
      from public.workout_sets s
      join public.workout_exercises e on e.id = s.workout_exercise_id
      where e.workout_id = w.id and not e.deleted and not s.deleted and s.completed_at is not null
    ),
    coalesce(
      (
        select jsonb_agg(jsonb_build_object(
          'user_id', r.user_id,
          'display_name', coalesce(rp.display_name, 'Crewmate'),
          'emoji', r.emoji
        ) order by r.created_at)
        from public.workout_reactions r
        left join public.profiles rp on rp.id = r.user_id
        where r.workout_id = w.id
      ),
      '[]'::jsonb
    )
  from public.crew_members m
  join public.workouts w
    on w.user_id = m.user_id
    and w.finished_at is not null
    and not w.deleted
    and w.started_at >= p_from
    and w.started_at < p_to
  left join public.profiles p on p.id = m.user_id
  left join public.program_days d on d.id = w.program_day_id
  where m.crew_id = p_crew_id
  order by w.finished_at desc
  limit 50;
end;
$$;

revoke execute on function public.can_react_to(uuid) from public, anon;
revoke execute on function public.set_reaction(uuid, text) from public, anon;
revoke execute on function public.crew_feed(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.set_reaction(uuid, text) to authenticated;
grant execute on function public.crew_feed(uuid, timestamptz, timestamptz) to authenticated;
