# Pull Up — Offline-First Workout Logging (Sub-project B) — Design

**Date:** 2026-10-14
**Status:** Approved approach (Legend-State v3 + syncedSupabase)
**Depends on:** Sub-project A (dev build + Unistyles theme) — required
(MMKV persistence and the logging UI's styling both need it).

**Scope:** Hevy-style live workout logging, offline-first: an exercise
library; start a workout from a programme day (prefilled targets) or empty;
log sets (weight × reps or duration) with previous-session ghost values and
tap-to-complete; per-exercise rest timer; live duration/volume/sets header;
finish with a summary. Add Set is in scope; adding/swapping/reordering
exercises mid-workout is sub-project C; programme editing is sub-project D.

## Decisions already made

| Decision | Choice |
| --- | --- |
| Offline | Offline from day one (PRD requirement) |
| Sync stack | Legend-State v3 `syncedSupabase` (beta accepted) for workout data + exercise library; React Query stays for programme content (read-only) |
| Local persistence | MMKV (`react-native-mmkv`) via Legend-State persist plugin |
| Exercise identity | Real `exercises` library table, seeded now |
| Units | kg only (toggle later) |
| Conflict model | Last-write-wins per row — safe because workout rows are single-writer (owner only) |
| Realtime | Off for this slice; sync on app start/foreground via `changesSince: 'last-sync'` |
| Rest timer | In-app countdown (no push notifications yet) |

## Schema (new migrations, forward-only)

Legend-State sync requirements apply to all synced tables: `created_at` /
`updated_at` (trigger-maintained) and soft-delete `deleted boolean default
false`. A shared trigger function `handle_times()` sets both timestamps.

**`exercises`** — the library.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `name` | text, unique among global rows | "Squat (Barbell)" style naming |
| `muscle_group` | text | e.g. legs, back, chest, shoulders, core, full body |
| `equipment` | text | barbell, dumbbell, machine, bodyweight, band, other |
| `owner_id` | uuid nullable FK auth.users | null = global library row; set = user's custom exercise (creation UI later) |
| timestamps + `deleted` | | synced read-mostly |

Seed: ~150 common lifts plus every movement in the 8-Week Peak programme
(power clean, hang power clean, front/back squat, trap bar deadlift/jump,
Cossack squat, Spanish squat iso, Copenhagen plank, lateral bound, depth
jump, pogo hops, sprints, approach jump, slam ball, face pull, band ER,
Y-T-W, scap pull-up, calf raise, weighted pull-up, push-up variants, bench,
overhead press, DB row…). RLS: `select` where `owner_id is null or owner_id
= auth.uid()`; `insert/update` own rows only (policy ready; no UI yet).

**`day_exercises.exercise_id`** — new nullable uuid FK → exercises, plus a
backfill migration mapping the seeded programme's `exercise_name` strings to
library rows (exact-name mapping table in the migration; unmatched rows stay
null and the UI falls back to `exercise_name` text).

**`workouts`**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | client-generated (offline create) |
| `user_id` | uuid FK auth.users | RLS + sync filter |
| `title` | text | defaults to the day name ("Mon — Lower power + sprints") or "Workout" |
| `program_day_id` | uuid nullable FK program_days | provenance; null for empty workouts |
| `started_at` / `finished_at` | timestamptz / nullable | active workout = `finished_at is null` |
| `notes` | text nullable | |
| timestamps + `deleted` | | |

**`workout_exercises`**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | client-generated |
| `user_id` | uuid | denormalized for RLS/sync |
| `workout_id` | uuid FK workouts | |
| `exercise_id` | uuid nullable FK exercises | |
| `exercise_name` | text | snapshot at log time — history survives library renames and covers unmatched programme rows |
| `position` | int | |
| `rest_seconds` | int nullable | per-exercise rest timer; null = timer off |
| `notes` | text nullable | |
| timestamps + `deleted` | | |

**`workout_sets`**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | client-generated |
| `user_id` | uuid | denormalized |
| `workout_exercise_id` | uuid FK workout_exercises | |
| `position` | int | display order; warm-ups show "W", working sets number 1..n |
| `set_type` | text check | `warmup` \| `working` \| `drop` \| `failure` |
| `weight_kg` | numeric nullable | |
| `reps` | int nullable | |
| `duration_seconds` | int nullable | timed sets (isos, timed warm-ups) — a set uses weight×reps OR duration |
| `target` | text nullable | ghost text from the programme ("4 × 3 @ 87% TM") or blank |
| `completed_at` | timestamptz nullable | null = not completed; tap-to-complete sets it |
| timestamps + `deleted` | | |

**RLS:** the three workout tables: all four verbs scoped
`user_id = (select auth.uid())`. No service-role paths.

**Deletes are soft** everywhere synced (`deleted = true`), required by
`changesSince`; the client filters `deleted` rows out.

## Sync layer (`src/lib/sync.ts` + `src/features/workouts/store.ts`)

- One `syncedSupabase` observable per table (`exercises`, `workouts`,
  `workout_exercises`, `workout_sets`), object-keyed by id (Legend-State's
  recommended shape), `changesSince: 'last-sync'`, filtered to
  `user_id = session.user.id` for workout tables.
- Persistence: MMKV plugin; writes land locally first and retry to Supabase
  automatically — airplane-mode logging works, syncs on reconnect.
- Store initialization happens after `AuthGate` provides a session (user id
  is part of the persist key so a future identity switch can't bleed data).
- Programme content and `user_programs` remain on React Query untouched.

## Flows

**Start from programme day:** the day screen (for the active programme)
gains a "Start workout" CTA → creates `workout` + one `workout_exercise`
per lifting-day exercise (library id from `day_exercises.exercise_id`,
snapshot name, default `rest_seconds` 150 for lifts / null for timed holds)
+ `workout_sets` rows per prescribed set (count from `day_exercises.sets`,
`target` text from sets × reps @ load, `set_type` working) → navigates to
the active-workout screen. **Empty workout:** CTA on the home screen.

**Active workout screen** (`/workout/[id]`, full-screen route):
- Header: elapsed duration (ticking), total volume (Σ `weight_kg × reps`
  over completed sets), completed-set count, Finish button.
- One card per exercise: name, notes field, rest-timer row
  ("Rest Timer: 2min 30s" / OFF), set table (SET | PREVIOUS | KG | REPS |
  ✓) — or (SET | PREVIOUS | TIME | ✓) for duration sets.
- PREVIOUS shows the same-position set from the user's most recent
  *finished* workout containing that `exercise_id` (from the local store);
  tapping it copies the values in.
- Completing a set stamps `completed_at` and auto-starts the rest timer if
  `rest_seconds` is set (countdown banner, ±15s adjust, skip, haptic on
  zero). Timer state is in-memory only.
- "+ Add Set" appends a row (copies the previous row's values/type).
- Set rows support: numeric keyboards, set-type cycling on the set-number
  tap (W/1/2/3…), swipe-to-delete (soft delete).

**Resume:** an unfinished workout (`finished_at is null`) shows a
"Resume workout" banner on the home screen; starting a new workout while
one is active prompts to resume or discard.

**Finish:** stamps `finished_at`, shows a summary (title, duration, volume,
sets completed, per-exercise best set), then returns home. Discard
soft-deletes the workout. Finishing with zero completed sets prompts
"discard instead?".

## Screens & code layout

```
src/features/workouts/
  store.ts          # legend-state observables + syncedSupabase config
  selectors.ts      # volume, duration, previous-set lookup, summary (pure, tested)
  start.ts          # buildWorkoutFromDay(day, exercises) → row payloads (pure, tested)
  components/       # SetRow, ExerciseCard, RestTimerBar, WorkoutHeader
src/app/
  workout/[id]/index.tsx    # active workout screen
  workout/[id]/summary.tsx
```

UI uses Unistyles tokens (sub-project A) + RN primitives; `@expo/ui` where
native rows fit. No decorative invention beyond the Hevy-reference layout.

## Error handling

- All writes are local-first; sync failures are invisible (retry) but a
  small "pending sync" indicator appears on the home screen when the queue
  is non-empty, if the plugin exposes that state cheaply — otherwise
  deferred.
- Starting a workout requires the programme cache (already loaded to reach
  the day screen); empty workouts need nothing remote.
- Store init failure (MMKV) surfaces a blocking error — same pattern as
  AuthGate.

## Testing

- Pure-function unit tests: `buildWorkoutFromDay` (prefill: counts, targets,
  rest defaults, timed vs weighted), volume/duration selectors (ignores
  uncompleted + deleted sets), previous-set lookup (position matching,
  most-recent-finished ordering), summary derivation.
- Store/sync config smoke-tested with Legend-State's in-memory persist in
  jest (no network).
- Manual on dev build: full log flow, airplane-mode logging + reconnect
  sync (verify rows land in Supabase), resume, discard, rest timer.
- Seed-style verification script extension: `exercises` count and
  `day_exercises` backfill coverage (report unmatched names).

## Out of scope (this sub-project)

Add/swap/remove/reorder exercises mid-workout and editing rest
timers/notes via ⋮ menus (C); programme editing (D); supersets; RPE; PR
detection and finish-card photo/caption; push-notification rest timer;
realtime multi-device sync; kg/lb toggle; custom-exercise creation UI;
Hevy/Strong import.

## Open questions deferred

- Volume definition currently includes completed warm-up sets with weight;
  revisit with PR/progress slice.
- Anonymous-user data migration on identity upgrade (slice with auth
  upgrade).
- `exercises` illustrations/animations (asset sourcing).
