-- Working the waitlist: when each address was sent its TestFlight link.
-- Set from the local dashboard (scripts/waitlist-dashboard.mjs) with the
-- service role; the public still can't read or change anything here.
alter table public.waitlist add column invited_at timestamptz;
