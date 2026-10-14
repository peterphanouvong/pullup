# Pull Up — Mid-Workout Editing (Sub-project C) — Design

**Date:** 2026-10-14
**Status:** Approved scope (Peter: "the full Hevy UX"), direction per the
Hevy reference screenshots + design-v2 system.
**Depends on:** Sub-project B (store, hooks, active-workout screen).

**Scope:** everything behind Hevy's ⋮ menus and the Add Exercise flow,
inside a live workout: add an exercise from the library (searchable picker),
replace an exercise, remove it, reorder (move up/down), per-exercise rest-
timer configuration (sheet with presets), per-exercise notes (already an
input in B — C only ensures the menu focuses it). All operations are
local-first store writes (Legend-State), synced like everything else.

## UX

**Add Exercise.** A full-width secondary button at the bottom of the active
workout ("+ Add Exercise") opens the exercise picker. Picking appends a new
`workout_exercise` (position = max+1) with one empty working set.

**Exercise picker** (modal route `/workout/picker` presented over the
workout; also reused by Replace):
- Search field (name, case/diacritic-insensitive contains).
- Filter chips: muscle groups (All, Legs, Back, Chest, Shoulders, Arms,
  Core, Full body); equipment stays a visual tag on rows, not a filter (YAGNI).
- Rows: name (heading), muscle group · equipment caption; "Recent" section
  on top (distinct exercises from the user's last 10 finished workouts,
  most recent first, max 8) above "All exercises" (alphabetical).
- Data from the `exercises$` store — fully offline.
- No custom-exercise creation yet (library only; creation is a later slice).

**Per-exercise ⋮ menu** (IconCircle in the exercise card header; iOS-native
action sheet via `ActionSheetIOS`/`Alert` — no new dependency):
- **Add note** — focuses the card's notes input.
- **Replace exercise** — opens the picker; on pick: updates the SAME
  `workout_exercise` row's `exercise_id` + `exercise_name` snapshot; keeps
  set rows and their entered values; previous-session ghosts re-derive from
  the new exercise (may become "—").
- **Move up / Move down** — swaps `position` with the adjacent non-deleted
  exercise; disabled at the ends.
- **Rest timer…** — preset sheet: OFF / 1:00 / 1:30 / 2:00 / 2:30 / 3:00 →
  writes `rest_seconds` (replaces B's cycle-tap behavior with this sheet;
  the timer row remains the tap target).
- **Remove exercise** — confirm alert, then soft-deletes the
  `workout_exercise` and all its sets.

**Reorder correctness rule:** position swaps consider only non-deleted
exercises; the move logic is a pure function (tested) over the sorted
visible list, writing both affected rows' positions.

## Code layout

```
src/features/workouts/
  edit.ts                   # pure: moveExercise(list, id, dir) → position writes;
                            # buildAddedExercise(...); buildReplacement(...)
  __tests__/edit.test.ts
  components/exercise-picker.tsx   # list UI (search, chips, sections)
  components/exercise-menu.ts      # action-sheet wiring
src/app/workout/picker.tsx         # modal route hosting the picker
                                   # (params: workoutId, mode=add|replace, workoutExerciseId?)
src/features/workouts/hooks.ts     # + addExerciseToWorkout, replaceExercise,
                                   # removeExercise, moveExercise, setRestSeconds,
                                   # useExerciseSearch(query, group), useRecentExercises()
```

UI in the design-v2 system (Screen/Card/SectionLabel/NumeralRow-style rows,
label-type chips); picker search uses a plain TextInput styled with tokens.

## Testing

Pure functions TDD: move up/down across soft-deleted neighbors and at ends;
search filter (case/diacritics, group filter); recent-exercises derivation
(distinct, ordered, finished-only, cap 8); replacement payload (keeps sets,
swaps identity). Manual: full ⋮ flows on the dev build incl. offline.

## Out of scope

Drag-handle reorder (menu-based move is the slice); supersets; custom
exercise creation; exercise detail pages/illustrations; editing finished
workouts; programme/routine editing (sub-project D).
