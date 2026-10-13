-- Fix: Week 6 (Convert 4) Monday lateral bound was missing the landing cue.
-- The Mon jump+sprint template's lateral bound Load cell reads "Stick landings
-- in Convert 1; continuous from 2 Nov if solid" (source doc §Session templates).
-- Week 6 begins 16 Nov, which is after 2 Nov, so it should carry the same
-- "continuous bounds" cue already applied to Week 4 and Week 5 — the W6
-- override only changed the dose (2 x 4/side), not the landing cue.
update public.day_exercises de
set notes = $t$Continuous bounds from 2 Nov if landings are solid$t$
from public.program_days pd
join public.program_weeks pw on pw.id = pd.week_id
join public.programs p on p.id = pw.program_id
where de.day_id = pd.id
  and p.slug = '8-week-peak'
  and pw.position = 6
  and pd.position = 1
  and de.exercise_name = $t$Lateral bound$t$;
