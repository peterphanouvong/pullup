-- High/low on every week of Peter's 8-Week Peak instance, not just from 26
-- Oct: weeks 1 (Load 2, 12 Oct) and 2 (Deload, 19 Oct) get the same session
-- layout as weeks 3–6 (20261021120000_high_low_peak.sql), with the week's
-- own loads. Week 1 keeps its Sun 18 Oct comp. Days are updated in place.
-- Source: docs/programs/8-week-peak-high-low.md.

-- Session-scoped helper: one high/low week on an existing week row.
create function pg_temp.apply_high_low_week(
  p_week_id uuid,
  p_clean_sets int, p_clean_reps text, p_clean_pct text,
  p_squat_sets int, p_squat_pct text,
  p_main_pct text,      -- bench / overhead press
  p_accessory_sets int,
  p_sat_name text, p_sat_notes text,
  p_sun_name text, p_sun_kind text, p_sun_notes text
) returns void language plpgsql as $$
declare
  v_day_id uuid;
begin
  update public.program_days set name = $t$Mon — Speed and power$t$, kind = 'lifting',
    notes = $t$HIGH. ~50 min; if a jump feels flat, the jumping is finished for the day.$t$
  where week_id = p_week_id and position = 1 returning id into v_day_id;
  delete from public.day_exercises where day_id = v_day_id;
  insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
  (v_day_id, 1, $t$Sprints$t$, 4, $t$25 m$t$, $t$Max$t$, $t$Full recovery$t$),
  (v_day_id, 2, $t$Power clean$t$, p_clean_sets, p_clean_reps, p_clean_pct, $t$Crisp only$t$),
  (v_day_id, 3, $t$Depth jump (30–40 cm) → max approach jump$t$, 4, $t$3$t$, $t$Bodyweight$t$, null),
  (v_day_id, 4, $t$Front squat$t$, 3, $t$3$t$, p_squat_pct, $t$Fast$t$),
  (v_day_id, 5, $t$Repeat pogo hops$t$, 2, $t$25$t$, $t$Submaximal$t$, $t$Rhythmic$t$);

  update public.program_days set name = $t$Tue — Upper strength$t$, kind = 'lifting',
    notes = $t$LOW. ~40 min. Nothing below the waist.$t$
  where week_id = p_week_id and position = 2 returning id into v_day_id;
  delete from public.day_exercises where day_id = v_day_id;
  insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
  (v_day_id, 1, $t$Bench press$t$, p_squat_sets + 1, $t$3$t$, p_main_pct, $t$Max bar speed$t$),
  (v_day_id, 2, $t$Weighted pull-up$t$, p_accessory_sets + 2, $t$4$t$, $t$RPE 8$t$, null),
  (v_day_id, 3, $t$DB row$t$, p_accessory_sets + 1, $t$8/arm$t$, $t$Moderate$t$, null),
  (v_day_id, 4, $t$Face pull + external rotation$t$, p_accessory_sets + 1, $t$15$t$, $t$Light$t$, null);

  update public.program_days set name = $t$Wed — Heavy lower + court$t$, kind = 'lifting',
    notes = $t$HIGH. ~45 min at midday, court at night. Refuel between sessions: carbs and fluid within 30 minutes of the lift, a proper meal 3–4 hours before court, something light an hour before.$t$
  where week_id = p_week_id and position = 3 returning id into v_day_id;
  delete from public.day_exercises where day_id = v_day_id;
  insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
  (v_day_id, 1, $t$Hang power clean$t$, p_squat_sets, $t$2$t$, p_clean_pct, $t$Fast$t$),
  (v_day_id, 2, $t$Back squat$t$, p_squat_sets, $t$3$t$, p_squat_pct, $t$Explosive up$t$),
  (v_day_id, 3, $t$Trap bar jump$t$, p_squat_sets, $t$3$t$, $t$20–30% of trap bar DL$t$, $t$Step down and reset every rep$t$),
  (v_day_id, 4, $t$Standing calf raise$t$, p_accessory_sets + 1, $t$12–15$t$, $t$RPE 8$t$, $t$Slow lower$t$),
  (v_day_id, 5, $t$Copenhagen plank$t$, 2, $t$20 s/side$t$, null, null);

  update public.program_days set name = $t$Thu — Upper, lighter$t$, kind = 'lifting',
    notes = $t$LOW. ~35 min. Deliberately easy: if you finish feeling like you could do it twice, that's correct.$t$
  where week_id = p_week_id and position = 4 returning id into v_day_id;
  delete from public.day_exercises where day_id = v_day_id;
  insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
  (v_day_id, 1, $t$Overhead press$t$, p_squat_sets, $t$3$t$, p_main_pct, null),
  (v_day_id, 2, $t$Pull-ups$t$, p_accessory_sets + 1, $t$6$t$, $t$Bodyweight$t$, null),
  (v_day_id, 3, $t$Push-ups$t$, p_accessory_sets + 1, $t$12$t$, null, $t$Explosive$t$),
  (v_day_id, 4, $t$Band Y-T-W, scap work$t$, p_accessory_sets + 1, $t$12$t$, $t$Light$t$, null);

  update public.program_days set name = $t$Fri — Primer$t$, kind = 'lifting',
    notes = $t$LOW. ~20 min after the full warm-up. Leave feeling sharper, not tired: no barbell, no accessories, no "while I'm here".$t$
  where week_id = p_week_id and position = 5 returning id into v_day_id;
  delete from public.day_exercises where day_id = v_day_id;
  insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
  (v_day_id, 1, $t$Slam ball overhead slam$t$, 3, $t$5$t$, null, null),
  (v_day_id, 2, $t$Approach jumps$t$, 5, $t$1$t$, $t$Maximal$t$, $t$At a target$t$),
  (v_day_id, 3, $t$Build-up sprints$t$, 2, $t$15 m$t$, $t$~80%$t$, null);

  update public.program_days set name = p_sat_name, kind = 'court', notes = p_sat_notes
  where week_id = p_week_id and position = 6 returning id into v_day_id;
  delete from public.day_exercises where day_id = v_day_id;

  update public.program_days set name = p_sun_name, kind = p_sun_kind, notes = p_sun_notes
  where week_id = p_week_id and position = 7 returning id into v_day_id;
  delete from public.day_exercises where day_id = v_day_id;
end;
$$;

do $$
declare
  v_owner constant uuid := 'd131ff1a-6b97-4b2d-88d8-34829183c1f3'; -- Peter
  v_program_id uuid;
  v_week_id uuid;
begin
  select p.id into v_program_id
  from public.user_programs up
  join public.programs p on p.id = up.program_id
  join public.programs t on t.id = p.template_id
  where up.user_id = v_owner and p.owner_id = v_owner and t.slug = '8-week-peak';
  if v_program_id is null then
    raise exception 'no 8-week-peak instance for the owner';
  end if;

  -- Week 1 — Load 2 (12 Oct), comp Sun 18 Oct. Already behind us; laid out
  -- the same way so the programme reads as one structure end to end.
  update public.program_weeks set description =
    $t$Peak intensity in the high/low layout: three hard days (Mon speed, Wed heavy lower + court, Sat court) and three easy ones. Mon cleans 5 × 1 @ 85%, Wed squat 4 × 3 @ 78% TM. Saturday court is skill work only with the comp on Sunday.$t$
  where program_id = v_program_id and position = 1 returning id into v_week_id;
  perform pg_temp.apply_high_low_week(v_week_id,
    5, '1', '85%', 4, '78% TM', '78% TM', 2,
    $t$Sat — Court (required)$t$, $t$HIGH. Skill work only, minimal jumping, full warm-up.$t$,
    $t$Sun — Comp$t$, 'comp', $t$Run the full fuelling protocol as a rehearsal.$t$);

  -- Week 2 — Deload (19 Oct). Same three hard days, everything lighter.
  update public.program_weeks set description =
    $t$Deload in the high/low layout: the same three hard days, everything lighter so the comp clears and the new structure beds in. Main lifts 3 × 3 @ 70% TM, cleans 3 × 2 @ 65%, accessories 2 sets. Set new training maxes at the end of the week.$t$
  where program_id = v_program_id and position = 2 returning id into v_week_id;
  perform pg_temp.apply_high_low_week(v_week_id,
    3, '2', '65%', 3, '70% TM', '70% TM', 1,
    $t$Sat — Court$t$, $t$HIGH. Full warm-up first: cold 9am jumps are how ankles go.$t$,
    $t$Sun — Rest$t$, 'rest', null);

  -- Link the new rows to the exercise library; refuse to finish with any unlinked.
  update public.day_exercises de set exercise_id = e.id
  from public.exercises e
  where e.owner_id is null and lower(e.name) = lower(de.exercise_name) and de.exercise_id is null;

  with mapping (seed_name, library_name) as (
    values
      ('Sprints', 'Sprint'),
      ('Build-up sprints', 'Sprint'),
      ('Depth jump (30–40 cm) → max approach jump', 'Depth Jump'),
      ('Repeat pogo hops', 'Pogo Hop'),
      ('Bench press', 'Bench Press (Barbell)'),
      ('Weighted pull-up', 'Pull Up (Weighted)'),
      ('DB row', 'Row (Dumbbell)'),
      ('Face pull + external rotation', 'Face Pull (Cable)'),
      ('Standing calf raise', 'Calf Raise (Standing)'),
      ('Overhead press', 'Overhead Press (Barbell)'),
      ('Pull-ups', 'Pull Up'),
      ('Push-ups', 'Push Up'),
      ('Band Y-T-W, scap work', 'Y-T-W Raise (Dumbbell)'),
      ('Approach jumps', 'Approach Jump')
  )
  update public.day_exercises de set exercise_id = e.id
  from mapping m
  join public.exercises e on e.owner_id is null and e.name = m.library_name
  where de.exercise_name = m.seed_name and de.exercise_id is null;

  if exists (
    select 1 from public.day_exercises de
    join public.program_days pd on pd.id = de.day_id
    join public.program_weeks pw on pw.id = pd.week_id
    where pw.program_id = v_program_id and de.exercise_id is null
  ) then
    raise exception 'unlinked day_exercises after high/low rewrite of weeks 1–2';
  end if;
end $$;
