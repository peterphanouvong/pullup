# Offline-First Workout Logging (Sub-project B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hevy-style offline-first workout logging: exercise library, start-from-programme-day with prefilled targets, live set logging with previous-session ghost values, per-exercise rest timer, finish + summary — all persisted locally (MMKV) and synced to Supabase via Legend-State.

**Architecture:** New Supabase tables (`exercises`, `workouts`, `workout_exercises`, `workout_sets`) with soft deletes + `created_at`/`updated_at` triggers for Legend-State's `changesSince` sync; `syncedSupabase` observables with MMKV persistence as the single source of truth for workout data (React Query keeps programme content); pure, tested functions for prefill/selectors; screens built on sub-project A's Unistyles tokens.

**Tech Stack:** @legendapp/state@beta (v3) + `syncedSupabase` + MMKV persist plugin, react-native-mmkv, Supabase migrations, Expo Router, Unistyles v3.

**Spec:** `docs/superpowers/specs/2026-10-14-workout-logging-design.md`

## Global Constraints

- Schema changes only via forward-only migrations in `supabase/migrations/`, applied with `supabase db push`; never edit an applied migration.
- All synced tables carry `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()` (trigger-maintained), `deleted boolean not null default false`. Client code NEVER hard-deletes synced rows — set `deleted = true`.
- Workout tables (`workouts`, `workout_exercises`, `workout_sets`) carry denormalized `user_id uuid not null` with RLS on all four verbs scoped `user_id = (select auth.uid())`. `exercises`: select where `owner_id is null or owner_id = (select auth.uid())`; insert/update own rows only.
- Row ids are client-generated UUIDs (offline creates): use `expo-crypto`'s `randomUUID()` (install via `npx expo install expo-crypto`) — never `Math.random`-based ids.
- `workout_sets.set_type` check: `('warmup','working','drop','failure')`. A set is weight×reps OR duration — never both populated.
- Units kg only. Volume = Σ `weight_kg × reps` over sets with `completed_at` set and `deleted = false`.
- Previous-value rule (spec): same `position` set from the user's most recent FINISHED (`finished_at` non-null, not deleted) workout containing that `exercise_id`.
- Default `rest_seconds` on prefill: 150 for weighted exercises, null for duration-based ones.
- Legend-State store code lives in `src/features/workouts/`; programme content stays on React Query untouched.
- UI uses the design-v2 system (spec: `docs/superpowers/specs/2026-10-14-design-v2-today-ia.md`, binding; components from `src/components/ui/` — Card, GradientCard, PrimaryButton, SectionLabel, IconCircle, NumeralRow): no hex literals outside the theme file, NO `@expo/ui` imports, Hevy layout skinned per that spec's "Logging-screen skin" section (done-tinted completed rows, label-type table headers, GradientCard finish recap). Deps only via `npx expo install`.
- Every task ends with `npx jest --silent`, `npx expo lint`, `npx tsc --noEmit` clean. Commits stage only task files — never `git add -A`.
- API reality rule (proven in slice 1): before coding against Legend-State, READ the installed package's exports (hook may be `use$` or `useValue` depending on beta build; sync import paths under `@legendapp/state/sync-plugins/supabase` and `@legendapp/state/persist-plugins/mmkv`) and https://legendapp.com/open-source/state/v3/sync/supabase/ — record the real API in the task report; the plan's snippets follow the docs at planning time, the installed package wins.
- IA reality (post design-v2 plan): home is the Today tab at `src/app/(tabs)/index.tsx`; programme browse lives at `(tabs)/plan.tsx`; `(tabs)/activities.tsx` exists with an empty state awaiting this plan's store. Where tasks below say "home screen", read the Today tab.

## Review Focus

1. **Sync write amplification / wrong shape** — Legend-State arrays don't sync well; stores must be object-keyed by id (spec). A list-shaped store silently corrupts updates. → Task 2's store shape + smoke test.
2. **Soft-delete leakage** — every selector/screen must filter `deleted`; a missed filter resurrects deleted sets in volume and previous-value lookups. → Task 3 selector tests include deleted rows that must be ignored.
3. **Prefill fidelity** — `buildWorkoutFromDay` must produce the right set counts, targets, and timed-vs-weighted split for real seed rows ("4 × 2 @ 85%", "30–45 s" isos, sprints). → Task 3 TDD against fixtures copied from actual seed data.
4. **RLS vs sync filter mismatch** — the client filters `user_id = session.user.id`, RLS enforces the same; a mismatch shows as silent empty sync, not an error. → Task 2 smoke test + Task 6 airplane/reconnect manual check verifies rows actually land in Supabase.
5. **Timer/duration drift** — elapsed-duration header and rest countdown must tick from timestamps (`started_at`, timer end time), not accumulated setInterval ticks, or backgrounding breaks them. → Task 4/5 implementation rule + Task 6 manual check (background the app mid-workout and mid-rest).

---

### Task 1: Migrations — sync plumbing, exercises library, workout tables, backfill

**Files:**
- Create: `supabase/migrations/<ts>_workout_schema.sql`, `supabase/migrations/<ts>_seed_exercises.sql`, `supabase/migrations/<ts>_day_exercises_backfill.sql`
- Modify: `scripts/verify-seed.mjs` (extend)

**Interfaces:**
- Produces: the four tables + columns exactly as the spec's tables section defines (Tasks 2–5 depend on exact column names); `day_exercises.exercise_id uuid nullable` backfilled for the 8-Week Peak seed; `handle_times()` trigger function.

- [ ] **Step 1: `workout_schema` migration** — transcribe the spec's schema section verbatim into SQL:
  - `create function public.handle_times()` (plpgsql): on INSERT set `created_at`/`updated_at = now()`; on UPDATE keep `created_at`, set `updated_at = now()`; `security definer` not needed. Attach `before insert or update` triggers to `exercises`, `workouts`, `workout_exercises`, `workout_sets`.
  - `exercises(id uuid pk default gen_random_uuid(), name text not null, muscle_group text not null, equipment text not null, owner_id uuid references auth.users(id) on delete cascade, created_at, updated_at, deleted)` + partial unique index on `(name)` where `owner_id is null`.
  - `workouts(id uuid pk, user_id uuid not null references auth.users(id) on delete cascade, title text not null, program_day_id uuid references public.program_days(id) on delete set null, started_at timestamptz not null, finished_at timestamptz, notes text, created_at, updated_at, deleted)` — NOTE: id has NO default (client-generated), same for the two tables below.
  - `workout_exercises(id uuid pk, user_id uuid not null, workout_id uuid not null references public.workouts(id) on delete cascade, exercise_id uuid references public.exercises(id), exercise_name text not null, position int not null, rest_seconds int, notes text, created_at, updated_at, deleted)`.
  - `workout_sets(id uuid pk, user_id uuid not null, workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade, position int not null, set_type text not null check (set_type in ('warmup','working','drop','failure')) default 'working', weight_kg numeric, reps int, duration_seconds int, target text, completed_at timestamptz, created_at, updated_at, deleted)`.
  - `alter table public.day_exercises add column exercise_id uuid references public.exercises(id);`
  - RLS enable on all four + policies per Global Constraints (workout tables: four verbs `user_id = (select auth.uid())`; exercises: the owner-or-global select, own-row insert/update).
- [ ] **Step 2: `seed_exercises` migration** — ~150 global rows (`owner_id null`): the standard barbell/dumbbell/machine/bodyweight staples per muscle group, PLUS every movement named in `docs/programs/8-week-peak.md` (Task brief: enumerate them from the committed doc — sprints, power clean, hang power clean, front squat, back squat, standing calf raise, repeat pogo hops, slam ball overhead slam, rotational wall throw, bench press, weighted pull-up, pull-up, DB row, Spanish squat iso, wall sit iso, overhead press, push-up (feet elevated), push-up, face pull, external rotation, band ER, Y-T-W, scap pull-up, Cossack squat, Copenhagen plank, trap bar deadlift, trap bar jump, depth jump, approach jump, lateral bound, glute bridge, dead bug, ankle rocks, 90/90 hip switch, thoracic opener, band pull-apart…). Name them Hevy-style where standard ("Squat (Barbell)", "Bench Press (Barbell)", "Row (Dumbbell)") but keep programme-specific movements under their doc names so the backfill maps exactly.
- [ ] **Step 3: `day_exercises_backfill` migration** — `update public.day_exercises de set exercise_id = e.id from public.exercises e where e.owner_id is null and lower(e.name) = lower(de.exercise_name)` PLUS an explicit mapping block (`update ... where de.exercise_name = '<seed name>' and exercise_id is null` → the library row) for every seed name that doesn't exact-match a library name (e.g. seed "Bench press" → "Bench Press (Barbell)", "Sprints" → "Sprint", compound rows like "Face pull + external rotation" and "Depth jump (30–40 cm) → max approach jump at a target" map to the closest primary movement; "Band ER, Y-T-W, scap work" → "Band External Rotation"). Target: ZERO null `exercise_id` across the 8-Week Peak's day_exercises.
- [ ] **Step 4: `supabase db push`**, then extend `scripts/verify-seed.mjs`: assert `exercises` global count ≥ 100, assert `day_exercises` null-`exercise_id` count = 0 (print offenders if any), keep existing assertions. Run `npm run verify-seed` — expect OK.
- [ ] **Step 5: Gates + commit** (`git add supabase/migrations scripts/verify-seed.mjs` + commit "feat: workout schema, exercise library, programme backfill").

---

### Task 2: Legend-State store + Supabase sync + MMKV persistence

**Files:**
- Create: `src/features/workouts/store.ts`, `src/features/workouts/types.ts`
- Modify: `package.json` (deps)
- Test: `src/features/workouts/__tests__/store.test.ts`

**Interfaces:**
- Consumes: `supabase` client (`@/lib/supabase`), `useSession`.
- Produces (Tasks 3–5 depend on these exact names):
  - `types.ts`: `Exercise`, `Workout`, `WorkoutExercise`, `WorkoutSet` row interfaces mirroring the DB columns in camel-free snake_case AS STORED (keep `snake_case` field names matching Supabase columns — Legend-State syncs raw rows; no mapping layer).
  - `store.ts`: `initWorkoutStore(userId: string): void` (idempotent), `exercises$`, `workouts$`, `workoutExercises$`, `workoutSets$` — each an object-keyed observable (`Record<string, Row>`), plus `generateId(): string` (expo-crypto randomUUID).

- [ ] **Step 1: Install** — `npx expo install react-native-mmkv expo-crypto` and `pnpm add @legendapp/state@beta` (expo install may not resolve the beta tag; if so use the package manager directly and note it). Rebuild dev client if mmkv requires it (`npx expo run:ios`).
- [ ] **Step 2: Read the installed API** — confirm: react hook name (`use$`/`useValue`), `syncedSupabase` import path (`@legendapp/state/sync-plugins/supabase`), MMKV persist plugin path, `configureSynced` for shared defaults. Record in report.
- [ ] **Step 3: Implement `store.ts`** — per https://legendapp.com/open-source/state/v3/sync/supabase/ :

```ts
// Shape (adapt to installed API; structure is the contract):
const workouts$ = observable(syncedSupabase({
  supabase,
  collection: 'workouts',
  select: (from) => from.select('*').eq('user_id', userId),
  actions: ['read', 'create', 'update'],   // no hard deletes — soft-delete via update
  fieldDeleted: 'deleted',
  changesSince: 'last-sync',
  fieldCreatedAt: 'created_at',
  fieldUpdatedAt: 'updated_at',
  persist: { name: `workouts-${userId}`, plugin: ObservablePersistMMKV, retrySync: true },
  retry: { infinite: true },
}));
```

One per table (exercises$ is read-only: `actions: ['read']`, no user filter — RLS scopes it). `initWorkoutStore(userId)` builds all four once; persist names include `userId`.
- [ ] **Step 4: Smoke test** (`store.test.ts`) — with Supabase client mocked and Legend-State's in-memory persistence (or plugin mocked): `initWorkoutStore('u1')` creates observables; writing `workouts$['w1'].set({...})` is readable back; soft-delete helper sets `deleted: true` rather than removing the key. (This pins store SHAPE, not the sync protocol.) RED→GREEN not required (config, not logic) but the test must assert real reads/writes.
- [ ] **Step 5: Wire init** — in `src/app/_layout.tsx` (inside `AuthGate`'s child tree), a tiny `WorkoutStoreGate` that calls `initWorkoutStore(session.user.id)` once before rendering children.
- [ ] **Step 6: Gates + commit** ("feat: legend-state workout store with supabase sync and MMKV persistence").

---

### Task 3: Pure logic — prefill + selectors (TDD)

**Files:**
- Create: `src/features/workouts/start.ts`, `src/features/workouts/selectors.ts`
- Modify: `src/features/programs/types.ts`, `src/features/programs/mapping.ts`, `src/features/programs/api.ts` (carry the new `day_exercises.exercise_id` column through as `DayExercise.exerciseId: string | null`), `src/features/programs/__tests__/mapping.test.ts` (fixture + assertion update)
- Test: `src/features/workouts/__tests__/start.test.ts`, `src/features/workouts/__tests__/selectors.test.ts`

**Interfaces:**
- Consumes: `ProgramDay`/`DayExercise` types (programs feature), workout row types (Task 2), `generateId`.
- Produces (Tasks 4–5 consume):
  - `buildWorkoutFromDay(day: ProgramDay, opts: { userId: string; programDayId: string; now: Date; idGen?: () => string }): { workout: Workout; exercises: WorkoutExercise[]; sets: WorkoutSet[] }` — one workout titled `day.name`; one exercise row per `day.exercises` (position preserved, `exercise_id` from `day.exercises[i].exerciseId` when present — NOTE: extend the programs mapping/types to carry `exerciseId` from the new `day_exercises.exercise_id` column, a small `Modify` on `src/features/programs/{types,mapping,api}.ts` + test update); sets per prescription: `sets` count rows (default 1 when null), `target` = the human prescription string ("4 × 2 @ 85%" style, composed from sets/reps/load), duration-based when reps text looks like a time ("30–45 s", "20 s/side") → `rest_seconds` null, else 150.
  - `selectors.ts`: `workoutVolumeKg(sets: WorkoutSet[]): number`; `completedSetCount(sets): number`; `elapsedSeconds(workout, now: Date): number`; `previousSet(args: { exerciseId: string; position: number; workouts: Record<string, Workout>; workoutExercises: Record<string, WorkoutExercise>; sets: Record<string, WorkoutSet> }): WorkoutSet | null` (most recent finished, not deleted, excluding current workout); `workoutSummary(...)` (duration, volume, completed count, per-exercise best completed set by weight then reps).
- All pure, no store imports; every rule above gets a test, including: deleted rows ignored everywhere; uncompleted sets excluded from volume; previous-set position matching; timed-exercise detection for real seed strings ("30–45 s", "12–15", "3 + 1 single", "30 m").

- [ ] **Step 1: Write failing tests** (fixtures copied from real seed rows — W1 Mon's five exercises and a Spanish squat iso); **Step 2: run, confirm RED**; **Step 3: implement**; **Step 4: GREEN**; **Step 5: gates + commit** ("feat: workout prefill and selectors (TDD)").

---

### Task 4: Start flow + active workout screen (core logging)

**Files:**
- Create: `src/app/workout/[id]/index.tsx`, `src/features/workouts/components/workout-header.tsx`, `src/features/workouts/components/exercise-card.tsx`, `src/features/workouts/components/set-row.tsx`, `src/features/workouts/hooks.ts`
- Modify: `src/app/program/[id]/day/[dayId].tsx` ("Start workout" CTA), `src/app/(tabs)/index.tsx` (rewire Today's PrimaryButton from day-detail deep link to the real start flow; add "Start empty workout" secondary action; resume-banner slot — banner logic lands Task 5), `src/app/_layout.tsx` (register the workout route group if needed)

**Interfaces:**
- Consumes: store observables + `buildWorkoutFromDay` + selectors; Unistyles tokens.
- Produces: `startWorkoutFromDay(day, programDayId): workoutId` and `startEmptyWorkout(): workoutId` in `hooks.ts` (write the built rows into the observables, return the new id); route `/workout/[id]`.

- [ ] **Step 1: hooks.ts** — `startWorkoutFromDay`/`startEmptyWorkout` (writes via store), `useWorkout(id)` (reactive read of workout + its exercises + sets, sorted by position, deleted filtered — built on the installed react hook from Task 2's API notes), `completeSet(setId, now)`, `updateSet(setId, patch)`, `addSet(workoutExerciseId)` (copies last row's values/type), `softDeleteSet(setId)`, `finishWorkout(id, now)`, `discardWorkout(id)`.
- [ ] **Step 2: Screen + components** — layout per the Hevy reference, skinned per the design-v2 spec's "Logging-screen skin" section: header (collapse chevron + ticking elapsed in accent — derive from `started_at` timestamp on a 1s interval, never accumulate; volume; completed count; compact accent-pill Finish), exercise cards as `Card` (name in heading+accent, notes input, rest-timer row placeholder [Task 5], set table with `label`-type headers SET|PREVIOUS|KG|REPS|✓ or SET|PREVIOUS|TIME|✓), `SetRow` (set-number/type cycling on tap W→1..n→drop→failure, previous ghost ("—" when none; tap copies values), numeric inputs with tabular numerals, complete toggle stamping `completed_at` and applying the `done`-tinted row fill + filled check, swipe-to-delete → soft delete), "+ Add Set". Keyboard: numeric pads. Styling: tokens + kit only.
- [ ] **Step 3: CTAs** — day screen: "Start workout" (active programme only) → `startWorkoutFromDay` → `router.push('/workout/' + id)`. Home: "Empty workout" button.
- [ ] **Step 4: Gates + iOS bundle check + commit** ("feat: active workout logging screen").

---

### Task 5: Rest timer, resume, finish + summary, discard

**Files:**
- Create: `src/features/workouts/components/rest-timer-bar.tsx`, `src/app/workout/[id]/summary.tsx`, `src/features/workouts/components/resume-banner.tsx`
- Modify: `src/features/workouts/hooks.ts`, `src/app/workout/[id]/index.tsx`, `src/app/(tabs)/index.tsx` (resume banner), `src/app/(tabs)/activities.tsx` (replace the empty-state-only screen with the real history list: finished workouts newest-first as NumeralRow — day-of-month numeral + month label rail; title, duration · volume · sets meta; tap → summary; keep the empty state)
- Test: extend `selectors.test.ts` if summary logic grows (a `finishedWorkoutsNewestFirst` selector belongs there, tested incl. deleted/unfinished exclusion)

**Interfaces:** consumes Task 4. Produces the finished flows.

- [ ] **Step 1: Rest timer** — in-memory state `{ endsAt: Date } | null` (context or small observable): completing a set with the exercise's `rest_seconds` set starts it; `RestTimerBar` renders countdown derived from `endsAt - now` (1s tick), ±15s buttons adjust `endsAt`, skip clears, haptic (`expo-haptics`, install via expo install) at zero. Exercise card's "Rest Timer: 2min 30s / OFF" row cycles presets (OFF/60/90/120/150/180s) writing `rest_seconds`.
- [ ] **Step 2: Resume + guards** — home banner for any workout `finished_at == null && !deleted` → push to it; starting a new workout while one is active → alert: Resume / Discard old & start new.
- [ ] **Step 3: Finish + summary** — Finish: zero completed sets → "Discard instead?" alert; else stamp `finished_at`, route to `/workout/[id]/summary` (GradientCard recap per the design-v2 spec: big tabular numerals for duration/volume/sets, per-exercise best-set list below via `workoutSummary`), Done → Today tab. Discard (from the workout's own menu/alert) soft-deletes workout + children.
- [ ] **Step 4: Activities history list** per the Files note above (NumeralRow list + selector + empty state preserved) and Today-tab day-card checkmarks (a finished workout exists for the selected `program_day_id`).
- [ ] **Step 5: Gates + commit** ("feat: rest timer, resume, finish summary, activity history").

---

### Task 6: End-to-end verification sweep

**Files:** none (fixes only).

- [ ] **Step 1: Automated gates** — `npx jest --silent`, `npx expo lint`, `npx tsc --noEmit`, `npm run verify-seed`, `npx expo-doctor`, `npx expo export --platform web` (regression; legend-state/mmkv imports must not break static web export — if MMKV does, apply the same platform-split pattern as `supabase.web.ts`), iOS bundle check.
- [ ] **Step 2: Manual walkthrough (human, dev build)** — start from W1 Mon day → prefilled exercises/sets with targets; log sets incl. tap-previous-copy; rest timer auto-start/adjust/skip + background the app mid-rest (Review Focus 5); add set; swipe-delete; finish → summary; previous values appear next session for the same exercise; **airplane-mode full workout → reconnect → rows visible in Supabase dashboard** (Review Focus 4); resume banner after force-kill mid-workout; discard flow.
- [ ] **Step 3: Fix anything surfaced, re-run gates, commit** ("chore: logging slice verification fixes") — skip commit if clean.
