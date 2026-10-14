-- Backfill day_exercises.exercise_id for the 8-Week Peak seed against the
-- global exercises library. First pass: exact case-insensitive name match.
-- Second pass: explicit mapping for seeded exercise_name strings that don't
-- exact-match a library row (shorthand, compound rows, or different casing/
-- wording). Target: zero null exercise_id across day_exercises.

-- Pass 1: exact (case-insensitive) name match against the global library.
update public.day_exercises de
set exercise_id = e.id
from public.exercises e
where e.owner_id is null
  and lower(e.name) = lower(de.exercise_name)
  and de.exercise_id is null;

-- Pass 2: explicit mapping for non-exact-match seed names.
with mapping (seed_name, library_name) as (
  values
    ('Band ER, Y-T-W, scap work', 'Band External Rotation'),
    ('Bench press', 'Bench Press (Barbell)'),
    ('Calf raise', 'Calf Raise (Standing)'),
    ('Standing calf raise', 'Calf Raise (Standing)'),
    ('DB row', 'Row (Dumbbell)'),
    ('Depth jump (30–40 cm) → max approach jump at a target', 'Depth Jump'),
    ('Face pull', 'Face Pull (Cable)'),
    ('Face pull + external rotation', 'Face Pull (Cable)'),
    ('Iso', 'Spanish Squat Iso'),
    ('Overhead press', 'Overhead Press (Barbell)'),
    ('Pogo hops', 'Pogo Hop'),
    ('Repeat pogo hops', 'Pogo Hop'),
    ('Pull-up', 'Pull Up'),
    ('Pull-ups', 'Pull Up'),
    ('Push-up, feet elevated', 'Push Up (Feet Elevated)'),
    ('Push-ups', 'Push Up'),
    ('Skater stick', 'Lateral Bound'),
    ('Slam ball', 'Slam Ball Overhead Slam'),
    ('Slam ball / rotational wall throw', 'Slam Ball Overhead Slam'),
    ('Sprints', 'Sprint'),
    ('Weighted pull-up', 'Pull Up (Weighted)')
)
update public.day_exercises de
set exercise_id = e.id
from mapping m
join public.exercises e
  on e.owner_id is null and e.name = m.library_name
where de.exercise_name = m.seed_name
  and de.exercise_id is null;
