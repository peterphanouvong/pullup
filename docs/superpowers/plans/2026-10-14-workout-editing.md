# Mid-Workout Editing (Sub-project C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The full Hevy mid-workout editing UX: add exercise via a searchable library picker, replace, remove, move up/down, and rest-timer preset sheet — all as local-first store writes.

**Architecture:** Pure edit functions (`edit.ts`, TDD) over the Legend-State store from sub-project B; a modal picker route reused for add + replace; an iOS action sheet per exercise card; everything skinned in design-v2 components.

**Tech Stack:** Legend-State store (B), design-v2 kit, expo-router modal route, ActionSheetIOS/Alert (no new deps).

**Spec:** `docs/superpowers/specs/2026-10-14-workout-editing-design.md` (binding UX + layout). Parent: workout-logging + design-v2 specs.

## Global Constraints

- All writes through the B store observables; soft deletes only; client UUIDs via `generateId`.
- Position invariants: visible (non-deleted) exercises keep unique, gapless-enough-to-sort positions; move logic ignores deleted rows; new exercises append at max(position)+1.
- UI: design-v2 tokens/kit only; zero hex outside the theme; no new dependencies.
- Every task: `npx jest --silent`, `npx expo lint`, `npx tsc --noEmit` clean + iOS bundle check; scoped staging.
- Picker is offline-capable (store-only reads).

## Review Focus

1. **Move across soft-deleted neighbors** — moving an exercise adjacent to a deleted row must swap with the next VISIBLE row. → Task 1 TDD.
2. **Replace keeps entered data** — set rows, completed stamps, and values survive a replace; only identity (exercise_id + snapshot name) changes; ghosts re-derive. → Task 1 payload test + Task 2 manual.
3. **Remove cascades to sets** — soft-deleting an exercise soft-deletes its sets; volume/summary selectors already ignore deleted (B tests) but the hook must actually write the children. → Task 2 hook + a selector-level test with a removed exercise's sets.
4. **Picker search correctness** — case/diacritic-insensitive contains; group chips filter; Recent section distinct/ordered/finished-only/cap 8. → Task 1 TDD.
5. **Modal param flow** — picker invoked for add vs replace routes back correctly and never writes to the wrong workout_exercise. → Task 2 manual + param typing.

---

### Task 1: Pure edit logic + picker selectors (TDD)

**Files:**
- Create: `src/features/workouts/edit.ts`, `src/features/workouts/__tests__/edit.test.ts`
- Modify: `src/features/workouts/selectors.ts` (+ `searchExercises(exercises, query, group)`, `recentExerciseIds(workouts, workoutExercises, cap)`), extend `src/features/workouts/__tests__/selectors.test.ts`

**Interfaces (Task 2 consumes):**
- `moveExercise(visibleSorted: WorkoutExercise[], id: string, dir: 'up'|'down'): Array<{ id: string; position: number }>` (empty when at an end);
- `buildAddedExercise(args: { workoutId; userId; exercise: Exercise; position: number; idGen? }): { exercise: WorkoutExercise; set: WorkoutSet }` (one empty working set, rest_seconds 150);
- `buildReplacement(current: WorkoutExercise, exercise: Exercise): Partial<WorkoutExercise>` (exercise_id + exercise_name only);
- `searchExercises` (case/diacritic-insensitive contains + optional muscle_group, deleted filtered, alphabetical); `recentExerciseIds` (distinct exercise_ids from finished, non-deleted workouts newest-first, cap).

- [ ] Steps: failing tests for every Review Focus 1/2/4 case (incl. deleted-neighbor swaps, end disables, diacritics "Rom​anian" vs query "romanian", group filter, recent distinct/cap/finished-only) → RED → implement → GREEN → gates → commit ("feat: workout edit logic and picker selectors (TDD)").

---

### Task 2: Picker route, Add Exercise, ⋮ menu + operations

**Files:**
- Create: `src/app/workout/picker.tsx` (modal route; params `workoutId`, `mode: add|replace`, `workoutExerciseId?`), `src/features/workouts/components/exercise-picker.tsx`, `src/features/workouts/components/exercise-menu.ts`
- Modify: `src/features/workouts/hooks.ts` (+ `addExerciseToWorkout`, `replaceExercise`, `removeExercise` (cascades to sets), `moveExerciseInWorkout`, `setRestSeconds`, `useExerciseSearch`, `useRecentExercises`), `src/app/workout/[id]/index.tsx` (+ "+ Add Exercise" button; ⋮ IconCircle per card wired to the menu; rest-timer row opens the preset sheet), `src/app/_layout.tsx` or workout group layout (modal presentation for picker)

**Interfaces:** consumes Task 1 + B's store/hooks; produces the finished editing UX.

- [ ] Steps per the spec's UX section: picker UI (search TextInput, group chips as label-type pills, Recent + All sections, rows with name/meta) → Add Exercise flow → ⋮ action sheet (Add note focuses input via ref; Replace → picker in replace mode; Move up/down via moveExercise writes, disabled at ends; Rest timer… preset sheet OFF/60/90/120/150/180 writing rest_seconds; Remove with confirm + cascade) → gates + bundle + manual pass of every menu item (note results; full visual QA rides the branch review) → commit ("feat: mid-workout editing — picker, menu, operations").

---

### Task 3: Verification sweep

- [ ] Automated: jest, lint, tsc, `npm run verify-seed`, expo-doctor, `npx expo export --platform web`, iOS bundle.
- [ ] Manual (human, dev build): add/replace/remove/move during a live workout incl. airplane mode; replace keeps entered sets; removed exercise's volume disappears; picker search/chips/recent behave; rest-timer sheet applies and the auto-start uses the new value.
- [ ] Fixes only if surfaced; commit.
