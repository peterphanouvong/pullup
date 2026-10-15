/**
 * Pure mid-workout editing logic: move/add/replace an exercise in a live
 * workout. No store import — callers (Task 2's hooks.ts) read/write the
 * Legend-State observables themselves and hand this module plain data,
 * mirroring `start.ts`'s split.
 */

import type { Exercise, WorkoutExercise, WorkoutSet } from './types';

/**
 * Position writes for swapping a row with its adjacent visible neighbor.
 *
 * `visibleSorted` must already be sorted by position and filtered to
 * non-deleted rows by the caller — this function only ever swaps with the
 * array neighbor, never by numeric position adjacency, so a gap left by
 * soft-deleted rows (e.g. visible positions 1 and 4, with 2-3 held by
 * deleted rows) still swaps correctly between the two visible rows.
 *
 * Returns the two `{ id, position }` writes (positions swapped between the
 * row and its neighbor), or `[]` when `id` is at the corresponding end of
 * the list, is unknown, or the list has fewer than two rows.
 */
export function moveExercise(
  visibleSorted: WorkoutExercise[],
  id: string,
  dir: 'up' | 'down',
): { id: string; position: number }[] {
  const index = visibleSorted.findIndex((e) => e.id === id);
  if (index === -1) return [];

  const neighborIndex = dir === 'up' ? index - 1 : index + 1;
  if (neighborIndex < 0 || neighborIndex >= visibleSorted.length) return [];

  const row = visibleSorted[index];
  const neighbor = visibleSorted[neighborIndex];

  return [
    { id: row.id, position: neighbor.position },
    { id: neighbor.id, position: row.position },
  ];
}

export interface BuildAddedExerciseArgs {
  workoutId: string;
  userId: string;
  exercise: Exercise;
  position: number;
  now: Date;
  /** Client-generated id source. Defaults to a local UUID-v4-ish generator
   * (no native/store dependency), same convention as `start.ts`'s
   * `buildWorkoutFromDay` — production callers pass `workouts/store.ts`'s
   * `generateId` explicitly. */
  idGen?: () => string;
}

export interface BuildAddedExerciseResult {
  exercise: WorkoutExercise;
  set: WorkoutSet;
}

/** No native/crypto dependency on purpose — keeps this module store-free and
 * usable in plain Node/Jest, matching `start.ts`'s `fallbackIdGen`. */
function fallbackIdGen(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * "Add Exercise" payload: a new `workout_exercise` row (snapshotting the
 * library exercise's id + name) at `position`, plus its one empty working
 * set at set-position 1. `rest_seconds` defaults to 150 (same default as a
 * programme-day prefill in `start.ts`); the set carries no target text (an
 * ad-hoc add has no prescription to echo as a ghost).
 */
export function buildAddedExercise(args: BuildAddedExerciseArgs): BuildAddedExerciseResult {
  const idGen = args.idGen ?? fallbackIdGen;
  const nowIso = args.now.toISOString();

  const exercise: WorkoutExercise = {
    id: idGen(),
    user_id: args.userId,
    workout_id: args.workoutId,
    exercise_id: args.exercise.id,
    exercise_name: args.exercise.name,
    position: args.position,
    rest_seconds: 150,
    notes: null,
    created_at: nowIso,
    updated_at: nowIso,
    deleted: false,
  };

  const set: WorkoutSet = {
    id: idGen(),
    user_id: args.userId,
    workout_exercise_id: exercise.id,
    position: 1,
    set_type: 'working',
    weight_kg: null,
    reps: null,
    duration_seconds: null,
    target: null,
    completed_at: null,
    created_at: nowIso,
    updated_at: nowIso,
    deleted: false,
  };

  return { exercise, set };
}

/**
 * "Replace exercise" payload: identity fields only (`exercise_id` +
 * `exercise_name` snapshot from the newly-picked library row). The caller
 * merges this into the SAME `workout_exercise` row — sets, notes, and
 * rest_seconds are untouched because this function never mentions them.
 */
export function buildReplacement(exercise: Exercise): Pick<WorkoutExercise, 'exercise_id' | 'exercise_name'> {
  return { exercise_id: exercise.id, exercise_name: exercise.name };
}

/** Ids of the live sets below `fromSetId` in `siblingSets`, in position
 * order — the targets of the set row's "fill down" action, which copies a
 * row's logged values into every set after it. Returns an empty array when
 * the row is last (or missing), so callers can hide the affordance. */
export function fillDownTargets(siblingSets: WorkoutSet[], fromSetId: string): string[] {
  const live = siblingSets.filter((s) => !s.deleted).sort((a, b) => a.position - b.position);
  const index = live.findIndex((s) => s.id === fromSetId);
  if (index === -1) return [];
  return live.slice(index + 1).map((s) => s.id);
}
