-- Landing-page waitlist. The coming-soon page (landing/index.html) posts
-- here straight from the browser with the publishable key, so the table
-- only ever accepts inserts from the public: nothing can be read back
-- without the service role.

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  -- Where the sign-up came from: the page's ?ref= parameter, if any.
  source text,
  created_at timestamptz not null default now(),
  constraint waitlist_email_shape check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

-- One row per address however it's capitalised; the page treats the
-- resulting conflict as "you're already on the list".
create unique index waitlist_email_key on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

create policy "anyone can join the waitlist"
  on public.waitlist for insert to anon, authenticated
  with check (true);
