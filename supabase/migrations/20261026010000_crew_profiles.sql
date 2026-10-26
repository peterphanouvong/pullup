-- Crewmate profiles: your crew can see what you've trained, not just that
-- you trained. Until now crews saw a check-in (a day name and a set count,
-- through crew_feed); a profile shows the sessions themselves, exercises,
-- sets and weights, Hevy-style.
--
-- Read-only, crewmates only (shares_crew_with), and only finished work:
-- a session in progress, a deleted one, or a set you haven't ticked stays
-- yours. Writes are unchanged: own rows only.
--
-- The app's own sync filters on user_id, so these policies don't pull
-- anyone else's rows into your local store; a profile fetches them on
-- demand (src/features/stats/api.ts).

create policy "workouts readable by crewmates"
  on public.workouts for select to authenticated
  using (not deleted and finished_at is not null and public.shares_crew_with(user_id));

create policy "workout_exercises readable by crewmates"
  on public.workout_exercises for select to authenticated
  using (not deleted and public.shares_crew_with(user_id));

create policy "workout_sets readable by crewmates"
  on public.workout_sets for select to authenticated
  using (not deleted and completed_at is not null and public.shares_crew_with(user_id));

-- A profile reads one person's recent rows; the sync reads one person's
-- changes. Both filter on user_id, which had no index.
create index if not exists workouts_user_started_idx on public.workouts (user_id, started_at desc);
create index if not exists workout_exercises_user_created_idx on public.workout_exercises (user_id, created_at);
create index if not exists workout_sets_user_created_idx on public.workout_sets (user_id, created_at);
