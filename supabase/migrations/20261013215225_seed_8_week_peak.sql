-- Seed the 8-Week Peak programme (Good Neighbour Tournament), transcribed verbatim
-- from docs/programs/8-week-peak.md.
do $$
declare
  v_program_id uuid;
  v_week_id uuid;
  v_day_id uuid;
begin

-- ============================================================
-- Programme
-- ============================================================
insert into public.programs (slug, name, summary, description)
values (
  '8-week-peak',
  '8-Week Peak — Good Neighbour Tournament',
  'Peak for the Good Neighbour tournament (28–29 Nov): four lifting days + two court sessions a week, converting strength into approach-jump height.',
  $t$## Overview

Peak for the Good Neighbour tournament on Sat 28 and Sun 29 November, with two one-day comps as rehearsals on Sun 18 October and Sun 8 November. The goal is to touch the top of the antenna (3.23 m on a men's net) by 28 November.

The jump you need is 3.23 m minus your standing reach. Realistic gain across this block is about 2–5 cm, mostly from the taper and tighter approach mechanics.

| Week beginning | Phase | Comp | What it's for |
| --- | --- | --- | --- |
| Mon 12 Oct | Load 2 | **Sun 18 Oct** | Peak intensity, trimmed Thursday, comp rehearsal |
| Mon 19 Oct | Deload | — | Recover from the comp, start lateral bounds, optional 3RM |
| Mon 26 Oct | Convert 1 | — | New training maxes. Speed takes over. |
| Mon 2 Nov | Convert 2 | **Sun 8 Nov** | Approach-jump test Monday, trimmed Thursday |
| Mon 9 Nov | Convert 3 | — | Peak speed, sessions shifted a day later |
| Mon 16 Nov | Convert 4 | — | Last real week. Final approach-jump checkpoint. |
| Mon 23 Nov | Taper | **Sat 28 & Sun 29 Nov** | Two short sessions, then compete |

## Weekly rules

Four lifting days of 45–60 minutes, plus Wednesday night and Saturday morning court. If a week gets crowded, drop Friday. Never drop Monday or Thursday.

### Default week

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

Jumps are the scarce resource. From 26 Oct, every jump should be maximal and fresh, so extra court time works against you.

### Warm-up (about 8 minutes, every session)

- 2 min bike, rope or easy jog
- Ankle rocks × 10/side, 90/90 hip switches × 8/side, thoracic openers × 8/side
- Glute bridge × 10, dead bug × 8/side
- Mon and Thu: pogo hops × 20, then 2–3 build-up jumps
- Tue and Fri: band pull-aparts × 15, scap pull-ups × 8, push-ups × 10
- Before court (Wed, Sat, comps): Cossack squat 1 × 5/side bodyweight, iso 2 × 30 s, then the full 15-minute warm-up

### Knee and lateral work

| Exercise | When | Dose | Notes |
| --- | --- | --- | --- |
| Cossack squat | Thu, after squats | 3 × 6/side | Slow down, pause at the bottom. Bodyweight, then a light goblet. |
| Skater / lateral bound | Mon, from 19 Oct week | 3 × 4/side | Stick and hold 2 s on each landing. Continuous bounds from 2 Nov if landings are solid. |
| Spanish squat or wall sit iso | Tue, Fri, before court | 4–5 × 30–45 s | Hard, not maximal. Keep going through tournament week. |

Lateral bounds count toward your jump contacts; they aren't added on top. If the knee pain is on the inside or outside of the joint, or comes with swelling, clicking or sharp pain on cuts, see a physio before 28 November.

### Loading key

- Training max (TM) = 90% of your estimated 1RM. Recalculate in the 19 Oct deload week.
- Cleans run off your best power clean.
- **Bar speed governs everything.** If the bar slows, the set is over.
- RPE: 7 ≈ 3 reps left, 8 ≈ 2 left, 9 ≈ 1 left.
- Rest 3 minutes on main lifts.
- Every approach jump goes at a target: backboard, Vertec or the antenna. Focus on the penultimate step and arm swing.

## Comp-day fuelling (every comp, including 18 Oct and 8 Nov)

- **Night before:** carb-leaning dinner, magnesium, early night.
- **About 2 hours before first serve:** carb-dominant, low fat, low fibre (toast with honey, banana, cereal). No peanut butter or heavy protein.
- **Between games:** something every time you come off court (dates, bananas, muesli bars, chips for salt). Half a real meal at midday.
- **Drinks:** electrolytes from game one, one electrolyte bottle to every two of water. DIY: 500 ml water, 200 ml juice, ¼ tsp salt.
- **Caffeine:** espresso at breakfast, last dose by late morning. No pre-workout.
- **Saturday night of the tournament:** protein and carbs within an hour, then an early night. Recovery, not celebration.

## Cramp prevention

Late-tournament calf and hip-flexor cramping is a capacity problem, not a hydration one. Calf raises, Copenhagen planks and repeat pogo hops are built in to fix it. Don't skip Monday or Thursday in the fortnight before 28 November: reduce the load if you need to, but don't remove the sessions.

## Progress markers

| Marker | When |
| --- | --- |
| Standing reach and approach touch | This week, Mon 2 Nov, Mon 16 Nov, tournament |
| Squat / bench / trap bar 3RM | Thu 22 Oct (optional) |
| Power clean single | Only when bar speed is good |

The approach touch is the only marker that answers the question. Expect the 28 Nov touch to land 1–3 cm above the 16 Nov reading.

## Non-negotiables

7–9 hours of sleep, protein at 1.6–2.0 g per kg bodyweight, and the full warm-up every session and before every court session.$t$
)
returning id into v_program_id;

-- ============================================================
-- Week 1 — Mon 12 Oct (Load 2) · comp Sun 18 Oct
-- ============================================================
insert into public.program_weeks (program_id, position, name, phase, description)
values (
  v_program_id, 1, $t$Week 1 — Mon 12 Oct$t$, $t$Load 2$t$,
  $t$Peak intensity, but Thursday is trimmed so you're fresh on Sunday. Start Cossacks and isos this week; hold the lateral bounds until the deload.$t$
)
returning id into v_week_id;

-- Mon — Lower power + sprints
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 1, $t$Mon — Lower power + sprints$t$, 'lifting', null)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Sprints$t$, 5, $t$30 m$t$, $t$Max$t$, $t$2–3 min rest$t$),
(v_day_id, 2, $t$Power clean$t$, 4, $t$2$t$, $t$85%$t$, null),
(v_day_id, 3, $t$Front squat$t$, 4, $t$3$t$, $t$87% TM$t$, null),
(v_day_id, 4, $t$Standing calf raise$t$, 3, $t$12–15$t$, $t$RPE 8$t$, $t$Slow lower$t$),
(v_day_id, 5, $t$Repeat pogo hops$t$, 2, $t$25$t$, $t$Submaximal$t$, $t$Rhythmic$t$);

-- Tue — Upper push
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 2, $t$Tue — Upper push$t$, 'lifting', $t$Skip court tonight.$t$)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Slam ball overhead slam$t$, 4, $t$5$t$, $t$4 kg$t$, $t$Max effort$t$),
(v_day_id, 2, $t$Bench press$t$, 4, $t$3 + 1 single$t$, $t$87% TM, single @ 90%$t$, null),
(v_day_id, 3, $t$Weighted pull-up$t$, 4, $t$4$t$, $t$RPE 8$t$, null),
(v_day_id, 4, $t$DB row$t$, 3, $t$8/arm$t$, $t$Heavy$t$, null),
(v_day_id, 5, $t$Spanish squat iso$t$, 4, $t$30–45 s$t$, $t$Hard, not maximal$t$, null);

-- Wed — Court
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 3, $t$Wed — Court$t$, 'court', null);

-- Thu — Lower strength (trimmed)
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 4, $t$Thu — Lower strength (trimmed)$t$, 'lifting', $t$No trap bar deadlift this week.$t$)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Hang power clean$t$, 4, $t$2$t$, $t$85%$t$, null),
(v_day_id, 2, $t$Back squat$t$, 3, $t$3$t$, $t$85% TM$t$, $t$Single @ 90% only if the triples moved fast$t$),
(v_day_id, 3, $t$Cossack squat$t$, 2, $t$6/side$t$, $t$Bodyweight$t$, null),
(v_day_id, 4, $t$Standing calf raise$t$, 2, $t$12$t$, $t$Lighter than Monday$t$, null),
(v_day_id, 5, $t$Copenhagen plank$t$, 2, $t$20 s/side$t$, null, null);

-- Fri — Upper pull + overhead
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 5, $t$Fri — Upper pull + overhead$t$, 'lifting', $t$Get your bench and press singles here.$t$)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Overhead press$t$, 4, $t$3 + 1 single$t$, $t$87% TM, single @ 90%$t$, null),
(v_day_id, 2, $t$Weighted pull-up$t$, 4, $t$5$t$, $t$RPE 8$t$, null),
(v_day_id, 3, $t$Push-up, feet elevated$t$, 3, $t$12$t$, $t$Explosive up$t$, null),
(v_day_id, 4, $t$Face pull + external rotation$t$, 3, $t$15$t$, $t$Light$t$, null),
(v_day_id, 5, $t$Spanish squat iso$t$, 4, $t$30–45 s$t$, $t$Hard, not maximal$t$, null);

-- Sat — Court (required)
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 6, $t$Sat — Court (required)$t$, 'court', $t$Skill work only. Minimal jumping, full warm-up.$t$);

-- Sun — Comp
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 7, $t$Sun — Comp$t$, 'comp', $t$Run the full fuelling protocol as a rehearsal.$t$);

-- ============================================================
-- Week 2 — Mon 19 Oct (Deload)
-- ============================================================
insert into public.program_weeks (program_id, position, name, phase, description)
values (
  v_program_id, 2, $t$Week 2 — Mon 19 Oct$t$, $t$Deload$t$,
  $t$Recover from the comp, introduce lateral bounds, and set new training maxes. Every session is shifted so the comp has 48 hours to clear before you do any lower-body work. Main lifts 3 × 3 @ 70%, cleans 3 × 2 @ 65%, accessories 2 sets.$t$
)
returning id into v_week_id;

-- Mon — Upper push deload
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 1, $t$Mon — Upper push deload + mobility and a light flush$t$, 'lifting', null)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Bench press$t$, 3, $t$3$t$, $t$70%$t$, null),
(v_day_id, 2, $t$Slam ball$t$, 3, $t$5$t$, null, null),
(v_day_id, 3, $t$Pull-up$t$, 2, $t$5$t$, null, null),
(v_day_id, 4, $t$DB row$t$, 2, $t$8/arm$t$, null, null),
(v_day_id, 5, $t$Iso$t$, 4, $t$30 s$t$, null, null);

-- Tue — Lower deload
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 2, $t$Tue — Lower deload$t$, 'lifting', $t$No sprints.$t$)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Power clean$t$, 3, $t$2$t$, $t$65%$t$, null),
(v_day_id, 2, $t$Front squat$t$, 3, $t$3$t$, $t$70%$t$, null),
(v_day_id, 3, $t$Skater stick$t$, 2, $t$4/side$t$, null, $t$First exposure$t$),
(v_day_id, 4, $t$Calf raise$t$, 2, $t$12$t$, null, null),
(v_day_id, 5, $t$Pogo hops$t$, 1, $t$25$t$, null, null);

-- Wed — Court (optional, light)
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 3, $t$Wed — Court (optional, light)$t$, 'court', null);

-- Thu — Lower deload
insert into public.program_days (week_id, position, name, kind, notes)
values (
  v_week_id, 4, $t$Thu — Lower deload$t$, 'lifting',
  $t$Optional 3RM: squat, bench and trap bar deadlift, only if your legs feel good. Stop when bar speed drops. If you skip it: set new TMs off last week's 90% singles. If they moved fast, add 2.5–5%.$t$
)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Hang clean$t$, 3, $t$2$t$, $t$65%$t$, null),
(v_day_id, 2, $t$Back squat$t$, 3, $t$3$t$, $t$70%$t$, null),
(v_day_id, 3, $t$Cossack squat$t$, 2, $t$6/side$t$, null, null),
(v_day_id, 4, $t$Calf raise$t$, 2, $t$12$t$, null, null),
(v_day_id, 5, $t$Copenhagen plank$t$, 2, $t$20 s/side$t$, null, null);

-- Fri — Upper pull deload
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 5, $t$Fri — Upper pull deload$t$, 'lifting', null)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Overhead press$t$, 3, $t$3$t$, $t$70%$t$, null),
(v_day_id, 2, $t$Pull-up$t$, 2, $t$6$t$, null, null),
(v_day_id, 3, $t$Face pull$t$, 2, $t$15$t$, null, null),
(v_day_id, 4, $t$Iso$t$, 4, $t$30 s$t$, null, null);

-- Sat — Court
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 6, $t$Sat — Court$t$, 'court', null);

-- Sun — Rest
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 7, $t$Sun — Rest$t$, 'rest', null);

-- ============================================================
-- Week 3 — Mon 26 Oct (Convert 1)
-- ============================================================
insert into public.program_weeks (program_id, position, name, phase, description)
values (
  v_program_id, 3, $t$Week 3 — Mon 26 Oct$t$, $t$Convert 1$t$,
  $t$Strength is banked; every rep now moves with maximal intent at submaximal load. Jump contacts are capped at 40 per session, all maximal, with lateral bounds included in the 40. If a jump feels flat, that session's jumping is over. Sprints total 100–120 m.

26 Oct — Convert 1: main lifts 4 × 3 @ 78% TM, cleans 5 × 1 @ 85%. New TMs. Lateral bounds as stick landings.$t$
)
returning id into v_week_id;

-- Mon — Jump + sprint
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 1, $t$Mon — Jump + sprint$t$, 'lifting', null)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Sprints$t$, 4, $t$25 m$t$, $t$Max$t$, $t$Full recovery$t$),
(v_day_id, 2, $t$Power clean$t$, 5, $t$1$t$, $t$85%$t$, $t$Crisp only$t$),
(v_day_id, 3, $t$Depth jump (30–40 cm) → max approach jump at a target$t$, 4, $t$3$t$, $t$Bodyweight$t$, null),
(v_day_id, 4, $t$Lateral bound$t$, 3, $t$4/side$t$, null, $t$Stick landings$t$),
(v_day_id, 5, $t$Front squat$t$, 3, $t$3$t$, $t$75% TM$t$, $t$Fast$t$),
(v_day_id, 6, $t$Standing calf raise$t$, 3, $t$12–15$t$, $t$RPE 8$t$, null),
(v_day_id, 7, $t$Repeat pogo hops$t$, 2, $t$25$t$, $t$Submaximal$t$, null);

-- Tue — Upper push (speed)
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 2, $t$Tue — Upper push (speed)$t$, 'lifting', null)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Bench press$t$, 4, $t$3$t$, $t$78% TM$t$, $t$Max bar speed$t$),
(v_day_id, 2, $t$Slam ball / rotational wall throw$t$, 4, $t$5$t$, $t$4 kg$t$, null),
(v_day_id, 3, $t$Weighted pull-up$t$, 4, $t$4$t$, $t$RPE 7–8$t$, null),
(v_day_id, 4, $t$DB row$t$, 3, $t$8/arm$t$, $t$Moderate$t$, null),
(v_day_id, 5, $t$Spanish squat iso$t$, 4, $t$30–45 s$t$, $t$Hard, not maximal$t$, null);

-- Wed — Court
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 3, $t$Wed — Court$t$, 'court', null);

-- Thu — Lower power (contrast)
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 4, $t$Thu — Lower power (contrast)$t$, 'lifting', null)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Hang power clean$t$, 5, $t$2$t$, $t$80–85%$t$, $t$Fast$t$),
(v_day_id, 2, $t$Back squat$t$, 4, $t$3$t$, $t$78% TM$t$, $t$Explosive up$t$),
(v_day_id, 3, $t$Trap bar jump$t$, 5, $t$3$t$, $t$20–30% of trap bar DL$t$, $t$Step down and reset every rep$t$),
(v_day_id, 4, $t$Cossack squat$t$, 3, $t$6/side$t$, $t$Light goblet$t$, null),
(v_day_id, 5, $t$Standing calf raise$t$, 3, $t$12–15$t$, $t$RPE 8$t$, null),
(v_day_id, 6, $t$Copenhagen plank$t$, 2, $t$20 s/side$t$, null, null);

-- Fri — Upper pull + shoulder health
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 5, $t$Fri — Upper pull + shoulder health$t$, 'lifting', null)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Overhead press$t$, 4, $t$3$t$, $t$78% TM$t$, null),
(v_day_id, 2, $t$Pull-ups$t$, 3, $t$6$t$, $t$Bodyweight$t$, null),
(v_day_id, 3, $t$Push-ups$t$, 3, $t$12$t$, $t$Explosive$t$, null),
(v_day_id, 4, $t$Band ER, Y-T-W, scap work$t$, 3, $t$12$t$, $t$Light$t$, null),
(v_day_id, 5, $t$Spanish squat iso$t$, 4, $t$30–45 s$t$, $t$Hard, not maximal$t$, null);

-- Sat — Court
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 6, $t$Sat — Court$t$, 'court', null);

-- Sun — Rest
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 7, $t$Sun — Rest$t$, 'rest', null);

-- ============================================================
-- Week 4 — Mon 2 Nov (Convert 2) · comp Sun 8 Nov
-- ============================================================
insert into public.program_weeks (program_id, position, name, phase, description)
values (
  v_program_id, 4, $t$Week 4 — Mon 2 Nov$t$, $t$Convert 2$t$,
  $t$Strength is banked; every rep now moves with maximal intent at submaximal load. Jump contacts are capped at 40 per session, all maximal, with lateral bounds included in the 40. If a jump feels flat, that session's jumping is over. Sprints total 100–120 m.

2 Nov — Convert 2: main lifts 4 × 3 @ 80% TM, cleans 5 × 1 @ 88%. Approach-jump test Monday. Comp Sunday.$t$
)
returning id into v_week_id;

-- Mon — Jump + sprint (+ approach-jump test)
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 1, $t$Mon — Jump + sprint$t$, 'lifting', $t$Approach-jump test.$t$)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Sprints$t$, 4, $t$25 m$t$, $t$Max$t$, $t$Full recovery$t$),
(v_day_id, 2, $t$Power clean$t$, 5, $t$1$t$, $t$88%$t$, $t$Crisp only$t$),
(v_day_id, 3, $t$Depth jump (30–40 cm) → max approach jump at a target$t$, 4, $t$3$t$, $t$Bodyweight$t$, null),
(v_day_id, 4, $t$Lateral bound$t$, 3, $t$4/side$t$, null, $t$Continuous bounds from 2 Nov if landings are solid$t$),
(v_day_id, 5, $t$Front squat$t$, 3, $t$3$t$, $t$75% TM$t$, $t$Fast$t$),
(v_day_id, 6, $t$Standing calf raise$t$, 3, $t$12–15$t$, $t$RPE 8$t$, null),
(v_day_id, 7, $t$Repeat pogo hops$t$, 2, $t$25$t$, $t$Submaximal$t$, null);

-- Tue — Upper push (speed)
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 2, $t$Tue — Upper push (speed)$t$, 'lifting', null)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Bench press$t$, 4, $t$3$t$, $t$80% TM$t$, $t$Max bar speed$t$),
(v_day_id, 2, $t$Slam ball / rotational wall throw$t$, 4, $t$5$t$, $t$4 kg$t$, null),
(v_day_id, 3, $t$Weighted pull-up$t$, 4, $t$4$t$, $t$RPE 7–8$t$, null),
(v_day_id, 4, $t$DB row$t$, 3, $t$8/arm$t$, $t$Moderate$t$, null),
(v_day_id, 5, $t$Spanish squat iso$t$, 4, $t$30–45 s$t$, $t$Hard, not maximal$t$, null);

-- Wed — Court
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 3, $t$Wed — Court$t$, 'court', null);

-- Thu — Trimmed contrast
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 4, $t$Thu — Trimmed contrast$t$, 'lifting', $t$Bar speed only, nothing grinding.$t$)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Trap bar jump$t$, 3, $t$3$t$, $t$20–30% of trap bar DL$t$, null),
(v_day_id, 2, $t$Cossack squat$t$, 2, $t$6/side$t$, $t$Light goblet$t$, null),
(v_day_id, 3, $t$Standing calf raise$t$, 2, $t$12–15$t$, $t$Lighter$t$, null);

-- Fri — Upper pull + shoulder health
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 5, $t$Fri — Upper pull + shoulder health$t$, 'lifting', null)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Overhead press$t$, 4, $t$3$t$, $t$80% TM$t$, null),
(v_day_id, 2, $t$Pull-ups$t$, 3, $t$6$t$, $t$Bodyweight$t$, null),
(v_day_id, 3, $t$Push-ups$t$, 3, $t$12$t$, $t$Explosive$t$, null),
(v_day_id, 4, $t$Band ER, Y-T-W, scap work$t$, 3, $t$12$t$, $t$Light$t$, null),
(v_day_id, 5, $t$Spanish squat iso$t$, 4, $t$30–45 s$t$, $t$Hard, not maximal$t$, null);

-- Sat — Court (required, skill work)
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 6, $t$Sat — Court (required)$t$, 'court', $t$Skill work only. Leave early if you can.$t$);

-- Sun — Comp
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 7, $t$Sun — Comp$t$, 'comp', null);

-- ============================================================
-- Week 5 — Mon 9 Nov (Convert 3) — days shifted after the comp
-- ============================================================
insert into public.program_weeks (program_id, position, name, phase, description)
values (
  v_program_id, 5, $t$Week 5 — Mon 9 Nov$t$, $t$Convert 3$t$,
  $t$Strength is banked; every rep now moves with maximal intent at submaximal load. Jump contacts are capped at 40 per session, all maximal, with lateral bounds included in the 40. If a jump feels flat, that session's jumping is over. Sprints total 100–120 m.

9 Nov — Convert 3: main lifts 4 × 3 @ 82% TM, cleans 4 × 1 @ 90%. Peak speed. Days shifted after the comp.

Days shifted: Mon = upper push + mobility/flush, Tue = jump + sprint, Wed = skip court, or passing and setting only, Thu = lower contrast, Fri = upper pull, Sat = court. Judge Tuesday by bar speed. If the 90% cleans aren't crisp, drop to 85%.$t$
)
returning id into v_week_id;

-- Mon — Upper push + mobility and a light flush
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 1, $t$Mon — Upper push + mobility and a light flush$t$, 'lifting', null)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Bench press$t$, 4, $t$3$t$, $t$82% TM$t$, $t$Max bar speed$t$),
(v_day_id, 2, $t$Slam ball / rotational wall throw$t$, 4, $t$5$t$, $t$4 kg$t$, null),
(v_day_id, 3, $t$Weighted pull-up$t$, 4, $t$4$t$, $t$RPE 7–8$t$, null),
(v_day_id, 4, $t$DB row$t$, 3, $t$8/arm$t$, $t$Moderate$t$, null),
(v_day_id, 5, $t$Spanish squat iso$t$, 4, $t$30–45 s$t$, $t$Hard, not maximal$t$, null);

-- Tue — Jump + sprint
insert into public.program_days (week_id, position, name, kind, notes)
values (
  v_week_id, 2, $t$Tue — Jump + sprint$t$, 'lifting',
  $t$Judge by bar speed; if 90% cleans aren't crisp, drop to 85%.$t$
)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Sprints$t$, 4, $t$25 m$t$, $t$Max$t$, $t$Full recovery$t$),
(v_day_id, 2, $t$Power clean$t$, 4, $t$1$t$, $t$90%$t$, $t$Crisp only$t$),
(v_day_id, 3, $t$Depth jump (30–40 cm) → max approach jump at a target$t$, 4, $t$3$t$, $t$Bodyweight$t$, null),
(v_day_id, 4, $t$Lateral bound$t$, 3, $t$4/side$t$, null, $t$Continuous bounds from 2 Nov if landings are solid$t$),
(v_day_id, 5, $t$Front squat$t$, 3, $t$3$t$, $t$75% TM$t$, $t$Fast$t$),
(v_day_id, 6, $t$Standing calf raise$t$, 3, $t$12–15$t$, $t$RPE 8$t$, null),
(v_day_id, 7, $t$Repeat pogo hops$t$, 2, $t$25$t$, $t$Submaximal$t$, null);

-- Wed — Court (skip, or passing/setting only)
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 3, $t$Wed — Court$t$, 'court', $t$Skip court, or passing and setting only.$t$);

-- Thu — Lower power (contrast)
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 4, $t$Thu — Lower power (contrast)$t$, 'lifting', null)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Hang power clean$t$, 5, $t$2$t$, $t$80–85%$t$, $t$Fast$t$),
(v_day_id, 2, $t$Back squat$t$, 4, $t$3$t$, $t$82% TM$t$, $t$Explosive up$t$),
(v_day_id, 3, $t$Trap bar jump$t$, 5, $t$3$t$, $t$20–30% of trap bar DL$t$, $t$Step down and reset every rep$t$),
(v_day_id, 4, $t$Cossack squat$t$, 3, $t$6/side$t$, $t$Light goblet$t$, null),
(v_day_id, 5, $t$Standing calf raise$t$, 3, $t$12–15$t$, $t$RPE 8$t$, null),
(v_day_id, 6, $t$Copenhagen plank$t$, 2, $t$20 s/side$t$, null, null);

-- Fri — Upper pull + shoulder health
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 5, $t$Fri — Upper pull + shoulder health$t$, 'lifting', null)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Overhead press$t$, 4, $t$3$t$, $t$82% TM$t$, null),
(v_day_id, 2, $t$Pull-ups$t$, 3, $t$6$t$, $t$Bodyweight$t$, null),
(v_day_id, 3, $t$Push-ups$t$, 3, $t$12$t$, $t$Explosive$t$, null),
(v_day_id, 4, $t$Band ER, Y-T-W, scap work$t$, 3, $t$12$t$, $t$Light$t$, null),
(v_day_id, 5, $t$Spanish squat iso$t$, 4, $t$30–45 s$t$, $t$Hard, not maximal$t$, null);

-- Sat — Court
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 6, $t$Sat — Court$t$, 'court', null);

-- Sun — Rest
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 7, $t$Sun — Rest$t$, 'rest', null);

-- ============================================================
-- Week 6 — Mon 16 Nov (Convert 4)
-- ============================================================
insert into public.program_weeks (program_id, position, name, phase, description)
values (
  v_program_id, 6, $t$Week 6 — Mon 16 Nov$t$, $t$Convert 4$t$,
  $t$Strength is banked; every rep now moves with maximal intent at submaximal load. Jump contacts are capped at 40 per session, all maximal, with lateral bounds included in the 40. If a jump feels flat, that session's jumping is over. Sprints total 100–120 m.

16 Nov — Convert 4: main lifts 3 × 3 @ 78% TM, cleans 4 × 1 @ 85%. Last real week. Final jump checkpoint Monday. Lateral bounds 2 × 4/side, Cossacks 2 × 6/side.$t$
)
returning id into v_week_id;

-- Mon — Jump + sprint (final jump checkpoint)
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 1, $t$Mon — Jump + sprint$t$, 'lifting', $t$Final jump checkpoint.$t$)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Sprints$t$, 4, $t$25 m$t$, $t$Max$t$, $t$Full recovery$t$),
(v_day_id, 2, $t$Power clean$t$, 4, $t$1$t$, $t$85%$t$, $t$Crisp only$t$),
(v_day_id, 3, $t$Depth jump (30–40 cm) → max approach jump at a target$t$, 4, $t$3$t$, $t$Bodyweight$t$, null),
(v_day_id, 4, $t$Lateral bound$t$, 2, $t$4/side$t$, null, null),
(v_day_id, 5, $t$Front squat$t$, 3, $t$3$t$, $t$75% TM$t$, $t$Fast$t$),
(v_day_id, 6, $t$Standing calf raise$t$, 3, $t$12–15$t$, $t$RPE 8$t$, null),
(v_day_id, 7, $t$Repeat pogo hops$t$, 2, $t$25$t$, $t$Submaximal$t$, null);

-- Tue — Upper push (speed)
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 2, $t$Tue — Upper push (speed)$t$, 'lifting', null)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Bench press$t$, 3, $t$3$t$, $t$78% TM$t$, $t$Max bar speed$t$),
(v_day_id, 2, $t$Slam ball / rotational wall throw$t$, 4, $t$5$t$, $t$4 kg$t$, null),
(v_day_id, 3, $t$Weighted pull-up$t$, 4, $t$4$t$, $t$RPE 7–8$t$, null),
(v_day_id, 4, $t$DB row$t$, 3, $t$8/arm$t$, $t$Moderate$t$, null),
(v_day_id, 5, $t$Spanish squat iso$t$, 4, $t$30–45 s$t$, $t$Hard, not maximal$t$, null);

-- Wed — Court
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 3, $t$Wed — Court$t$, 'court', null);

-- Thu — Lower power (contrast)
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 4, $t$Thu — Lower power (contrast)$t$, 'lifting', null)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Hang power clean$t$, 5, $t$2$t$, $t$80–85%$t$, $t$Fast$t$),
(v_day_id, 2, $t$Back squat$t$, 3, $t$3$t$, $t$78% TM$t$, $t$Explosive up$t$),
(v_day_id, 3, $t$Trap bar jump$t$, 5, $t$3$t$, $t$20–30% of trap bar DL$t$, $t$Step down and reset every rep$t$),
(v_day_id, 4, $t$Cossack squat$t$, 2, $t$6/side$t$, $t$Light goblet$t$, null),
(v_day_id, 5, $t$Standing calf raise$t$, 3, $t$12–15$t$, $t$RPE 8$t$, null),
(v_day_id, 6, $t$Copenhagen plank$t$, 2, $t$20 s/side$t$, null, null);

-- Fri — Upper pull + shoulder health
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 5, $t$Fri — Upper pull + shoulder health$t$, 'lifting', null)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Overhead press$t$, 3, $t$3$t$, $t$78% TM$t$, null),
(v_day_id, 2, $t$Pull-ups$t$, 3, $t$6$t$, $t$Bodyweight$t$, null),
(v_day_id, 3, $t$Push-ups$t$, 3, $t$12$t$, $t$Explosive$t$, null),
(v_day_id, 4, $t$Band ER, Y-T-W, scap work$t$, 3, $t$12$t$, $t$Light$t$, null),
(v_day_id, 5, $t$Spanish squat iso$t$, 4, $t$30–45 s$t$, $t$Hard, not maximal$t$, null);

-- Sat — Court
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 6, $t$Sat — Court$t$, 'court', null);

-- Sun — Rest
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 7, $t$Sun — Rest$t$, 'rest', null);

-- ============================================================
-- Week 7 — Mon 23 Nov (Taper) · tournament Sat 28 & Sun 29 Nov
-- ============================================================
insert into public.program_weeks (program_id, position, name, phase, description)
values (
  v_program_id, 7, $t$Week 7 — Mon 23 Nov$t$, $t$Taper$t$,
  $t$Short, sharp, then nothing. The work is done; this week only preserves it. Keep the isos going all week.

No lateral bounds after Monday, and no calf raises this week.$t$
)
returning id into v_week_id;

-- Mon — Taper session
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 1, $t$Mon — Taper session$t$, 'lifting', $t$25 min.$t$)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Power clean$t$, 3, $t$1$t$, $t$80%$t$, null),
(v_day_id, 2, $t$Back squat$t$, 2, $t$3$t$, $t$70%$t$, null),
(v_day_id, 3, $t$Lateral bound$t$, 2, $t$3/side$t$, null, $t$Stick$t$),
(v_day_id, 4, $t$Approach jump$t$, 1, $t$5$t$, null, $t$At a target$t$);

-- Tue — Taper session
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 2, $t$Tue — Taper session$t$, 'lifting', $t$25 min.$t$)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Bench press$t$, 3, $t$3$t$, $t$70%$t$, null),
(v_day_id, 2, $t$Slam ball$t$, 3, $t$5$t$, null, null),
(v_day_id, 3, $t$Pull-up$t$, 2, $t$5$t$, null, null),
(v_day_id, 4, $t$Iso$t$, 3, $t$30 s$t$, null, null);

-- Wed — Court, light
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 3, $t$Wed — Court$t$, 'court', $t$Court only, light.$t$);

-- Thu — Full rest
insert into public.program_days (week_id, position, name, kind, notes)
values (
  v_week_id, 4, $t$Thu — Full rest$t$, 'rest',
  $t$Full rest. Carb-leaning dinner, magnesium, in bed by 10pm.$t$
);

-- Fri — Approach jumps only
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 5, $t$Fri — Approach jumps$t$, 'lifting', $t$Nothing else. Early night.$t$)
returning id into v_day_id;
insert into public.day_exercises (day_id, position, exercise_name, sets, reps, load, notes) values
(v_day_id, 1, $t$Approach jump$t$, 1, $t$5$t$, $t$Maximal$t$, $t$At a target$t$);

-- Sat — Day 1, compete
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 6, $t$Sat — Day 1 — compete$t$, 'comp', null);

-- Sun — Day 2, compete
insert into public.program_days (week_id, position, name, kind, notes)
values (v_week_id, 7, $t$Sun — Day 2 — compete$t$, 'comp', $t$Budget 20 minutes for the warm-up.$t$);

end $$;
