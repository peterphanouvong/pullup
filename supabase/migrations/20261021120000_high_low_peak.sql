-- High/low revision of Peter's 8-Week Peak instance from Mon 26 Oct (week 3)
-- onward. Only his copy changes; the 8-week-peak template and everyone else's
-- instances are untouched (see 20261021110000_program_instances.sql).
-- Weeks 1–2 (Load 2, Deload) are left exactly as they were; the deload is
-- the cheapest moment to change structure, so the new split starts after it.
-- Days are updated in place (ids kept) and their exercises replaced.
-- Source: docs/programs/8-week-peak-high-low.md.
--
-- Also pins his start_date to Mon 12 Oct: the weeks are dated (Week 1 — Mon
-- 12 Oct), and a 19 Oct start was showing week 1 during the deload and
-- pushing the taper past the tournament.
do $$
declare
  v_program_id uuid;
  v_week_id uuid;
  v_day_id uuid;
  v_desc text;
  v_old_rules constant text := $t$Four lifting days of 45–60 minutes, plus Wednesday night and Saturday morning court. If a week gets crowded, drop Friday. Never drop Monday or Thursday.$t$;
  v_new_rules constant text := $t$To 25 Oct: four lifting days of 45–60 minutes, plus Wednesday night and Saturday morning court. From 26 Oct the week runs high/low: fatigue is concentrated into three hard days instead of smeared across six, and volleyball is counted as training rather than ignored by it.$t$;
  v_old_week constant text := $t$### Default week

| Day | Session |
| --- | --- |
| Mon | Lower power + sprints (freshest legs) |
| Tue | Upper push + isos |
| Wed | Court (night) |
| Thu | Lower strength / contrast (midday) + Cossack squats |
| Fri | Upper pull + overhead + isos. Strictly upper body. |
| Sat | Court (morning, required) |
| Sun | Rest |

### Optional court nights

| Night | Load phase (to 25 Oct) | Convert phase (26 Oct on) |
| --- | --- | --- |
| Mon | No | No |
| Tue | Fine, low hitting volume | No |
| Wed | Yes | Yes |

Jumps are the scarce resource. From 26 Oct, every jump should be maximal and fresh, so extra court time works against you.$t$;
  v_new_week constant text := $t$### Default week (to 25 Oct)

| Day | Session |
| --- | --- |
| Mon | Lower power + sprints (freshest legs) |
| Tue | Upper push + isos |
| Wed | Court (night) |
| Thu | Lower strength / contrast (midday) + Cossack squats |
| Fri | Upper pull + overhead + isos. Strictly upper body. |
| Sat | Court (morning, required) |
| Sun | Rest |

### High/low week (from 26 Oct)

| Day | Load | Session |
| --- | --- | --- |
| Mon | **High** | Sprints, cleans, jumps, front squat |
| Tue | Low | Upper strength — "armour" |
| Wed | **High** | Heavy lower (midday) + court (night) |
| Thu | Low | Upper, lighter — pull and shoulder health |
| Fri | Low | Primer — leave feeling better than you arrived |
| Sat | **High** | Court (morning) |
| Sun | Off | Rest |

No two high days are adjacent: Mon→Wed is 48 h, Wed→Sat 72 h, Sat→Mon 48 h. Heavy squats move to Wednesday, the same day as court, so the cost of a hard day is paid once and Thursday becomes a real recovery day. Wednesday is now a genuinely big day and court quality that night may dip for a week or two. If it's consistently poor after two weeks, lift in the evening after court instead. If Monday feels heavy rather than fast, cut Wednesday to cleans and squats only.

If you also play Monday, lift first, play at night, and cut the depth jumps.

Refuelling between Wednesday's sessions is not optional: carbs and fluid within 30 minutes of finishing the lift, a proper meal 3–4 hours before court, something light an hour before.

Jumps are the scarce resource. From 26 Oct, every jump should be maximal and fresh, so extra court time works against you.$t$;
  -- Per-week loads for the Monday cleans and Wednesday squat, weeks 3–6.
  clean_sets constant int[] := array[5, 5, 4, 4];
  clean_pct constant text[] := array['85%', '88%', '90%', '85%'];
  squat_sets constant int[] := array[4, 4, 4, 3];
  squat_pct constant text[] := array['78% TM', '80% TM', '82% TM', '78% TM'];
  week_desc constant text[] := array[
    $t$First week of the high/low structure. Recalculate training maxes (90% of estimated 1RM). Mon cleans 5 × 1 @ 85%, Wed squat 4 × 3 @ 78% TM. Expect Wednesday to feel like a lot. Jump contacts are capped at 40 per session, all maximal; if a jump feels flat, that session's jumping is over.$t$,
    $t$Highest jump-quality week. Test your approach jump Monday. Mon cleans 5 × 1 @ 88%, Wed squat 4 × 3 @ 80% TM. Comp Sunday: Saturday court is skill work only and Friday's primer is the last real effort.$t$,
    $t$Peak speed: loads up, volume flat. Mon cleans 4 × 1 @ 90%, Wed squat 4 × 3 @ 82% TM. Monday follows the comp, so judge it by bar speed: if the 90% cleans aren't crisp, drop to 85%, and if the legs are plainly heavy, swap Monday and Tuesday.$t$,
    $t$Last real week. Sharpen, don't accumulate. Mon cleans 4 × 1 @ 85%, Wed squat 3 × 3 @ 78% TM.$t$
  ];
  i int;
  n int;
  v_owner constant uuid := 'd131ff1a-6b97-4b2d-88d8-34829183c1f3'; -- Peter
begin
  select p.id, p.description into v_program_id, v_desc
  from public.user_programs up
  join public.programs p on p.id = up.program_id
  join public.programs t on t.id = p.template_id
  where up.user_id = v_owner and p.owner_id = v_owner and t.slug = '8-week-peak';
  if v_program_id is null then
    raise exception 'no 8-week-peak instance for the owner';
  end if;
  if position(v_old_rules in v_desc) = 0 or position(v_old_week in v_desc) = 0 then
    raise exception 'instance description does not match the 8-week-peak seed; refusing to rewrite it';
  end if;

  update public.programs set
    summary = $t$Peak for the Good Neighbour tournament (28–29 Nov). High/low from 26 Oct: three hard days (Mon speed, Wed heavy lower + court, Sat court) and three easy ones, converting strength into approach-jump height.$t$,
    description = replace(replace(v_desc, v_old_rules, v_new_rules), v_old_week, v_new_week)
  where id = v_program_id;

  -- ============================================================
  -- Weeks 3–6: the standard high/low week with per-week loads
  -- ============================================================
  for i in 3..6 loop
    n := i - 2;
    update public.program_weeks set description = week_desc[n]
    where program_id = v_program_id and position = i
    returning id into v_week_id;
    if v_week_id is null then
      raise exception 'week % not found', i;
    end if;

    -- Mon — HIGH: speed and power
    update public.program_days set
      name = $t$Mon — Speed and power$t$, kind = 'lifting',
      notes = case i
        when 4 then $t$HIGH. Approach-jump test. ~50 min; if a jump feels flat, the jumping is finished for the day.$t$
        when 6 then $t$HIGH. Final jump checkpoint. ~50 min; if a jump feels flat, the jumping is finished for the day.$t$
        else $t$HIGH. ~50 min; if a jump feels flat, the jumping is finished for the day.$t$ end
    where week_id = v_week_id and position = 1 returning id into v_day_id;
    delete from public.day_exercises where day_id = v_day_id;
    insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
    (v_day_id, 1, $t$Sprints$t$, 4, $t$25 m$t$, $t$Max$t$, $t$Full recovery$t$),
    (v_day_id, 2, $t$Power clean$t$, clean_sets[n], $t$1$t$, clean_pct[n], $t$Crisp only$t$),
    (v_day_id, 3, $t$Depth jump (30–40 cm) → max approach jump$t$, 4, $t$3$t$, $t$Bodyweight$t$, null),
    (v_day_id, 4, $t$Front squat$t$, 3, $t$3$t$, $t$75% TM$t$, $t$Fast$t$),
    (v_day_id, 5, $t$Repeat pogo hops$t$, 2, $t$25$t$, $t$Submaximal$t$, $t$Rhythmic$t$);

    -- Tue — LOW: upper strength
    update public.program_days set
      name = $t$Tue — Upper strength$t$, kind = 'lifting',
      notes = $t$LOW. ~40 min. Nothing below the waist.$t$
    where week_id = v_week_id and position = 2 returning id into v_day_id;
    delete from public.day_exercises where day_id = v_day_id;
    insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
    (v_day_id, 1, $t$Bench press$t$, 5, $t$3$t$, $t$75–80% TM$t$, $t$Max bar speed$t$),
    (v_day_id, 2, $t$Weighted pull-up$t$, 4, $t$4$t$, $t$RPE 8$t$, null),
    (v_day_id, 3, $t$DB row$t$, 3, $t$8/arm$t$, $t$Moderate$t$, null),
    (v_day_id, 4, $t$Face pull + external rotation$t$, 3, $t$15$t$, $t$Light$t$, null);

    -- Wed — HIGH: heavy lower at midday, court at night
    update public.program_days set
      name = $t$Wed — Heavy lower + court$t$, kind = 'lifting',
      notes = $t$HIGH. ~45 min at midday, court at night. Refuel between sessions: carbs and fluid within 30 minutes of the lift, a proper meal 3–4 hours before court, something light an hour before.$t$
    where week_id = v_week_id and position = 3 returning id into v_day_id;
    delete from public.day_exercises where day_id = v_day_id;
    insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
    (v_day_id, 1, $t$Hang power clean$t$, 4, $t$2$t$, $t$80–85%$t$, $t$Fast$t$),
    (v_day_id, 2, $t$Back squat$t$, squat_sets[n], $t$3$t$, squat_pct[n], $t$Explosive up$t$),
    (v_day_id, 3, $t$Trap bar jump$t$, 4, $t$3$t$, $t$20–30% of trap bar DL$t$, $t$Step down and reset every rep$t$),
    (v_day_id, 4, $t$Standing calf raise$t$, 3, $t$12–15$t$, $t$RPE 8$t$, $t$Slow lower$t$),
    (v_day_id, 5, $t$Copenhagen plank$t$, 2, $t$20 s/side$t$, null, null);

    -- Thu — LOW: upper, lighter
    update public.program_days set
      name = $t$Thu — Upper, lighter$t$, kind = 'lifting',
      notes = $t$LOW. ~35 min. Deliberately easy: if you finish feeling like you could do it twice, that's correct.$t$
    where week_id = v_week_id and position = 4 returning id into v_day_id;
    delete from public.day_exercises where day_id = v_day_id;
    insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
    (v_day_id, 1, $t$Overhead press$t$, 4, $t$3$t$, $t$75% TM$t$, null),
    (v_day_id, 2, $t$Pull-ups$t$, 3, $t$6$t$, $t$Bodyweight$t$, null),
    (v_day_id, 3, $t$Push-ups$t$, 3, $t$12$t$, null, $t$Explosive$t$),
    (v_day_id, 4, $t$Band Y-T-W, scap work$t$, 3, $t$12$t$, $t$Light$t$, null);

    -- Fri — LOW: primer
    update public.program_days set
      name = $t$Fri — Primer$t$, kind = 'lifting',
      notes = $t$LOW. ~20 min after the full warm-up. Leave feeling sharper, not tired: no barbell, no accessories, no "while I'm here".$t$
    where week_id = v_week_id and position = 5 returning id into v_day_id;
    delete from public.day_exercises where day_id = v_day_id;
    insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
    (v_day_id, 1, $t$Slam ball overhead slam$t$, 3, $t$5$t$, null, null),
    (v_day_id, 2, $t$Approach jumps$t$, 5, $t$1$t$, $t$Maximal$t$, $t$At a target$t$),
    (v_day_id, 3, $t$Build-up sprints$t$, 2, $t$15 m$t$, $t$~80%$t$, null);

    -- Sat — HIGH: court
    update public.program_days set
      name = case i when 4 then $t$Sat — Court (required)$t$ else $t$Sat — Court$t$ end, kind = 'court',
      notes = case i
        when 4 then $t$HIGH. Skill work only, leave early if you can. Full warm-up first.$t$
        else $t$HIGH. Full warm-up first: cold 9am jumps are how ankles go.$t$ end
    where week_id = v_week_id and position = 6 returning id into v_day_id;
    delete from public.day_exercises where day_id = v_day_id;

    -- Sun — off (comp on 8 Nov)
    update public.program_days set
      name = case i when 4 then $t$Sun — Comp$t$ else $t$Sun — Rest$t$ end,
      kind = case i when 4 then 'comp' else 'rest' end,
      notes = case i when 4 then $t$Run the full fuelling protocol.$t$ else null end
    where week_id = v_week_id and position = 7 returning id into v_day_id;
    delete from public.day_exercises where day_id = v_day_id;
  end loop;

  -- ============================================================
  -- Week 7: taper — one low-grade high day early, nothing hard after it
  -- ============================================================
  update public.program_weeks set
    description = $t$Under high/low the taper has one low-grade high day early and nothing hard after it. No Wednesday lift, no calf raises; keep the isos going. Saturday evening is recovery, not celebration: protein and carbs within an hour, early night.$t$
  where program_id = v_program_id and position = 7
  returning id into v_week_id;

  update public.program_days set name = $t$Mon — Taper session$t$, kind = 'lifting',
    notes = $t$The week's one high day, kept low-grade. 25 min.$t$
  where week_id = v_week_id and position = 1 returning id into v_day_id;
  delete from public.day_exercises where day_id = v_day_id;
  insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
  (v_day_id, 1, $t$Power clean$t$, 3, $t$1$t$, $t$80%$t$, null),
  (v_day_id, 2, $t$Back squat$t$, 2, $t$3$t$, $t$70% TM$t$, null),
  (v_day_id, 3, $t$Approach jumps$t$, 5, $t$1$t$, $t$Maximal$t$, $t$At a target$t$);

  update public.program_days set name = $t$Tue — Taper session$t$, kind = 'lifting', notes = $t$25 min.$t$
  where week_id = v_week_id and position = 2 returning id into v_day_id;
  delete from public.day_exercises where day_id = v_day_id;
  insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
  (v_day_id, 1, $t$Bench press$t$, 3, $t$3$t$, $t$70% TM$t$, null),
  (v_day_id, 2, $t$Slam ball overhead slam$t$, 3, $t$5$t$, null, null),
  (v_day_id, 3, $t$Pull-ups$t$, 2, $t$5$t$, $t$Bodyweight$t$, null);

  update public.program_days set name = $t$Wed — Court$t$, kind = 'court', notes = $t$Court only, light. No lift.$t$
  where week_id = v_week_id and position = 3 returning id into v_day_id;
  delete from public.day_exercises where day_id = v_day_id;

  update public.program_days set name = $t$Thu — Rest$t$, kind = 'rest',
    notes = $t$Full rest. Carb-leaning dinner, magnesium, in bed by 10pm.$t$
  where week_id = v_week_id and position = 4 returning id into v_day_id;
  delete from public.day_exercises where day_id = v_day_id;

  update public.program_days set name = $t$Fri — Primer$t$, kind = 'lifting',
    notes = $t$Warm-up plus five maximal approach jumps. Nothing else. Early night.$t$
  where week_id = v_week_id and position = 5 returning id into v_day_id;
  delete from public.day_exercises where day_id = v_day_id;
  insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
  (v_day_id, 1, $t$Approach jumps$t$, 5, $t$1$t$, $t$Maximal$t$, $t$At a target$t$);

  update public.program_days set name = $t$Sat — Day 1 — compete$t$, kind = 'comp', notes = null
  where week_id = v_week_id and position = 6 returning id into v_day_id;
  delete from public.day_exercises where day_id = v_day_id;

  update public.program_days set name = $t$Sun — Day 2 — compete$t$, kind = 'comp',
    notes = $t$Budget 20 minutes for the warm-up, not 15.$t$
  where week_id = v_week_id and position = 7 returning id into v_day_id;
  delete from public.day_exercises where day_id = v_day_id;

  -- ============================================================
  -- Link the new rows to the exercise library (same two passes as the
  -- original backfill), and refuse to finish with any left unlinked.
  -- ============================================================
  update public.day_exercises de
  set exercise_id = e.id
  from public.exercises e
  where e.owner_id is null
    and lower(e.name) = lower(de.exercise_name)
    and de.exercise_id is null;

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
  update public.day_exercises de
  set exercise_id = e.id
  from mapping m
  join public.exercises e on e.owner_id is null and e.name = m.library_name
  where de.exercise_name = m.seed_name
    and de.exercise_id is null;

  if exists (
    select 1 from public.day_exercises de
    join public.program_days pd on pd.id = de.day_id
    join public.program_weeks pw on pw.id = pd.week_id
    where pw.program_id = v_program_id and de.exercise_id is null
  ) then
    raise exception 'unlinked day_exercises after high/low rewrite';
  end if;

  -- The programme is dated: week 1 is Mon 12 Oct whoever runs it.
  update public.user_programs set start_date = '2026-10-12'
  where user_id = v_owner and program_id = v_program_id;
end $$;
