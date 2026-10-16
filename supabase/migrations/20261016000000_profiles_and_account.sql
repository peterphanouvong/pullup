-- Accounts: a display name per user, and self-service account deletion.
--
-- Everyone starts as an anonymous user. Signing in with Apple or Google
-- links that identity onto the same auth.users row (manual linking), so
-- the user id — and every workout keyed to it — is unchanged. The profile
-- row arrives with the upgrade: guests have no name to show anyone.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null
    check (char_length(btrim(display_name)) between 1 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_handle_times
  before insert or update on public.profiles
  for each row execute function public.handle_times();

alter table public.profiles enable row level security;

-- Own row only for now. Crews will widen select to fellow members.
create policy "own profile select"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "own profile insert"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy "own profile update"
  on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- App Store guideline 5.1.1(v): an app that lets you create an account
-- must let you delete it. Every user-owned table cascades from auth.users,
-- so removing the auth row removes everything. Security definer because
-- clients can't touch the auth schema; it only ever deletes the caller.
create or replace function public.delete_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = (select auth.uid());
$$;

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
