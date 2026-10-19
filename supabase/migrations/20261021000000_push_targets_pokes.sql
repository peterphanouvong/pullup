-- Pushes, pokes, weekly targets and streaks.
--
-- Pushes leave the database as events: a trigger posts {type, id} to the
-- `push` edge function (via pg_net), which re-reads everything it says
-- from the database with the service role and talks to Expo's push API.
-- The function's URL and bearer key live in Vault, so nothing here is
-- environment-specific; without them the triggers are silent no-ops.

create extension if not exists pg_net with schema extensions;

-- ------------------------------------------------------------------
-- Profiles: what you're aiming for, and where you are
-- ------------------------------------------------------------------

alter table public.profiles
  add column weekly_target int not null default 3 check (weekly_target between 1 and 7),
  -- IANA zone from the device; weeks and the Sunday recap are in local time.
  add column timezone text not null default 'UTC';

-- ------------------------------------------------------------------
-- Push tokens: one row per device
-- ------------------------------------------------------------------

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_tokens_user_id_idx on public.push_tokens (user_id);

create trigger push_tokens_handle_times
  before insert or update on public.push_tokens
  for each row execute function public.handle_times();

alter table public.push_tokens enable row level security;

create policy "own push tokens"
  on public.push_tokens for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ------------------------------------------------------------------
-- Pokes: "you training today?", once a day per person
-- ------------------------------------------------------------------

create table public.pokes (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews(id) on delete cascade,
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index pokes_to_user_idx on public.pokes (to_user, created_at desc);
create index pokes_from_user_idx on public.pokes (from_user, created_at desc);

alter table public.pokes enable row level security;

create policy "pokes readable by sender and receiver"
  on public.pokes for select to authenticated
  using (from_user = (select auth.uid()) or to_user = (select auth.uid()));

create or replace function public.poke_crewmate(p_crew_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_permanent_account();
begin
  if p_user_id = uid then
    raise exception 'you can''t poke yourself' using errcode = 'P0001';
  end if;
  if not public.is_crew_member(p_crew_id)
     or not exists (select 1 from public.crew_members where crew_id = p_crew_id and user_id = p_user_id) then
    raise exception 'not in that crew' using errcode = '42501';
  end if;
  -- One nudge per person per day; more is nagging.
  if exists (
    select 1 from public.pokes
    where from_user = uid and to_user = p_user_id and created_at > now() - interval '20 hours'
  ) then
    raise exception 'you already poked them today' using errcode = 'P0001';
  end if;
  insert into public.pokes (crew_id, from_user, to_user) values (p_crew_id, uid, p_user_id);
end;
$$;

revoke execute on function public.poke_crewmate(uuid, uuid) from public, anon;
grant execute on function public.poke_crewmate(uuid, uuid) to authenticated;

-- ------------------------------------------------------------------
-- Streaks
-- ------------------------------------------------------------------

-- Monday of the local week `at` falls in, as a timestamptz instant.
create or replace function public.local_week_start(p_at timestamptz, tz text)
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select (date_trunc('week', p_at at time zone tz)) at time zone tz;
$$;

-- Consecutive weeks, ending now, in which the user finished at least
-- `weekly_target` sessions. The current week counts once it's met and
-- never breaks the run before it's over (same rule as the app's
-- `weekStreak`). Security definer: it reads another member's workouts.
create or replace function public.week_streak(p_user_id uuid, p_now timestamptz default now())
returns int
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target int;
  tz text;
  this_week timestamptz;
  streak int := 0;
  i int := 0;
  week_start timestamptz;
  n int;
begin
  select p.weekly_target, p.timezone into target, tz from public.profiles p where p.id = p_user_id;
  target := coalesce(target, 3);
  tz := coalesce(tz, 'UTC');
  this_week := public.local_week_start(p_now, tz);

  loop
    week_start := this_week - make_interval(weeks => i);
    select count(*) into n
    from public.workouts w
    where w.user_id = p_user_id
      and w.finished_at is not null
      and not w.deleted
      and w.started_at >= week_start
      and w.started_at < week_start + interval '7 days';

    if n >= target then
      streak := streak + 1;
    elsif i > 0 then
      exit;
    end if;
    i := i + 1;
    exit when i > 520; -- ten years is plenty
  end loop;
  return streak;
end;
$$;

revoke execute on function public.week_streak(uuid, timestamptz) from public, anon;
grant execute on function public.week_streak(uuid, timestamptz) to authenticated;

-- crew_week now also says what each member is aiming for and their streak.
drop function public.crew_week(uuid, timestamptz, timestamptz);

create or replace function public.crew_week(p_crew_id uuid, p_from timestamptz, p_to timestamptz)
returns table (
  user_id uuid,
  display_name text,
  joined_at timestamptz,
  session_starts timestamptz[],
  weekly_target int,
  streak int
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
    m.user_id,
    coalesce(p.display_name, 'Crewmate'),
    m.joined_at,
    coalesce(
      array_agg(w.started_at order by w.started_at) filter (where w.id is not null),
      '{}'
    ),
    coalesce(p.weekly_target, 3),
    public.week_streak(m.user_id, p_to - interval '1 second')
  from public.crew_members m
  left join public.profiles p on p.id = m.user_id
  left join public.workouts w
    on w.user_id = m.user_id
    and w.finished_at is not null
    and not w.deleted
    and w.started_at >= p_from
    and w.started_at < p_to
  where m.crew_id = p_crew_id
  group by m.user_id, p.display_name, m.joined_at, p.weekly_target;
end;
$$;

revoke execute on function public.crew_week(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.crew_week(uuid, timestamptz, timestamptz) to authenticated;

-- ------------------------------------------------------------------
-- Dispatching pushes
-- ------------------------------------------------------------------

-- Posts {type, id} to the push function. Reads its URL and bearer key
-- from Vault (`push_function_url`, `push_function_key`); with either
-- missing it does nothing, so local and fresh environments stay quiet.
create or replace function public.dispatch_push(p_type text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  url text;
  key text;
begin
  select decrypted_secret into url from vault.decrypted_secrets where name = 'push_function_url';
  select decrypted_secret into key from vault.decrypted_secrets where name = 'push_function_key';
  if url is null or key is null then
    return;
  end if;
  perform net.http_post(
    url := url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || key),
    body := jsonb_build_object('type', p_type, 'id', p_id),
    timeout_milliseconds := 5000
  );
exception when others then
  -- A push is never worth failing the write that caused it.
  raise warning 'dispatch_push(%): %', p_type, sqlerrm;
end;
$$;

revoke execute on function public.dispatch_push(text, uuid) from public, anon, authenticated;

-- The trigger functions are security definer so they can reach
-- dispatch_push() when fired by an ordinary user's write.

create or replace function public.notify_checkin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.finished_at is not null and old.finished_at is null and not new.deleted then
    perform public.dispatch_push('checkin', new.id);
  end if;
  return new;
end;
$$;

create trigger workouts_notify_checkin
  after update of finished_at on public.workouts
  for each row execute function public.notify_checkin();

create or replace function public.notify_reaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.dispatch_push('reaction', new.workout_id);
  return new;
end;
$$;

create trigger reactions_notify
  after insert or update of emoji on public.workout_reactions
  for each row execute function public.notify_reaction();

create or replace function public.notify_poke()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.dispatch_push('poke', new.id);
  return new;
end;
$$;

create trigger pokes_notify
  after insert on public.pokes
  for each row execute function public.notify_poke();

-- The Sunday recap: the function works out, for every device, whether it's
-- 6pm Sunday there right now, so one hourly tick covers every timezone.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('pullup-weekly-recap', '0 * * * *', $cron$ select public.dispatch_push('recap', null) $cron$);
exception when others then
  raise warning 'pg_cron not available; schedule the recap by hand: %', sqlerrm;
end;
$$;
