-- Crews: small private groups of mates who can see each other's training
-- week. Invite-only (a 6-character code); no search, no public profiles.
--
-- Members never read each other's workout rows directly: crew_week()
-- returns just who trained on which days, so titles and notes stay private.

create table public.crews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 30),
  invite_code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger crews_handle_times
  before insert or update on public.crews
  for each row execute function public.handle_times();

create table public.crew_members (
  crew_id uuid not null references public.crews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);

create index crew_members_user_id_idx on public.crew_members (user_id);

alter table public.crews enable row level security;
alter table public.crew_members enable row level security;

-- Security definer so policies on crew_members can ask about crew_members
-- without recursing into themselves.
create or replace function public.is_crew_member(p_crew_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.crew_members
    where crew_id = p_crew_id and user_id = (select auth.uid())
  );
$$;

create or replace function public.shares_crew_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.crew_members mine
    join public.crew_members theirs on theirs.crew_id = mine.crew_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = p_user_id
  );
$$;

-- Reads only. Every write goes through the functions below, which enforce
-- the rules (signed in, crew size, codes).
create policy "crews readable by members"
  on public.crews for select to authenticated
  using (public.is_crew_member(id));

create policy "crew members readable by fellow members"
  on public.crew_members for select to authenticated
  using (public.is_crew_member(crew_id));

-- Crewmates can see each other's names.
create policy "profiles readable by crewmates"
  on public.profiles for select to authenticated
  using (public.shares_crew_with(id));

-- ------------------------------------------------------------------
-- Writes
-- ------------------------------------------------------------------

-- Guests can't create or join: a crewmate needs a name and an account
-- that survives a reinstall.
create or replace function public.require_permanent_account()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then
    raise exception 'sign in to use crews' using errcode = '42501';
  end if;
  return uid;
end;
$$;

-- Unambiguous characters only: no 0/O, 1/I/L.
create or replace function public.new_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.crews where invite_code = code);
  end loop;
  return code;
end;
$$;

create or replace function public.create_crew(p_name text)
returns public.crews
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_permanent_account();
  crew public.crews;
begin
  insert into public.crews (name, invite_code, created_by)
  values (btrim(p_name), public.new_invite_code(), uid)
  returning * into crew;

  insert into public.crew_members (crew_id, user_id) values (crew.id, uid);
  return crew;
end;
$$;

-- Crews stay small: they're your mates, not an audience.
create or replace function public.join_crew(p_code text)
returns public.crews
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_permanent_account();
  crew public.crews;
  member_count int;
begin
  select * into crew from public.crews where invite_code = upper(btrim(p_code));
  if crew.id is null then
    raise exception 'no crew with that code' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.crew_members where crew_id = crew.id and user_id = uid) then
    return crew;
  end if;

  select count(*) into member_count from public.crew_members where crew_id = crew.id;
  if member_count >= 8 then
    raise exception 'that crew is full' using errcode = 'P0001';
  end if;

  insert into public.crew_members (crew_id, user_id) values (crew.id, uid);
  return crew;
end;
$$;

-- Leaving the last seat closes the crew.
create or replace function public.leave_crew(p_crew_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  delete from public.crew_members where crew_id = p_crew_id and user_id = uid;
  delete from public.crews c
  where c.id = p_crew_id
    and not exists (select 1 from public.crew_members m where m.crew_id = c.id);
end;
$$;

-- ------------------------------------------------------------------
-- Reads
-- ------------------------------------------------------------------

-- Each member and the start times of their finished sessions in
-- [p_from, p_to). Nothing else about the workouts leaves the server.
create or replace function public.crew_week(p_crew_id uuid, p_from timestamptz, p_to timestamptz)
returns table (user_id uuid, display_name text, joined_at timestamptz, session_starts timestamptz[])
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
    )
  from public.crew_members m
  left join public.profiles p on p.id = m.user_id
  left join public.workouts w
    on w.user_id = m.user_id
    and w.finished_at is not null
    and not w.deleted
    and w.started_at >= p_from
    and w.started_at < p_to
  where m.crew_id = p_crew_id
  group by m.user_id, p.display_name, m.joined_at;
end;
$$;

revoke execute on function public.new_invite_code() from public, anon, authenticated;
revoke execute on function public.require_permanent_account() from public, anon;
revoke execute on function public.create_crew(text) from public, anon;
revoke execute on function public.join_crew(text) from public, anon;
revoke execute on function public.leave_crew(uuid) from public, anon;
revoke execute on function public.crew_week(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.create_crew(text) to authenticated;
grant execute on function public.join_crew(text) to authenticated;
grant execute on function public.leave_crew(uuid) to authenticated;
grant execute on function public.crew_week(uuid, timestamptz, timestamptz) to authenticated;
