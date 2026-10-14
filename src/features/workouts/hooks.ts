/**
 * Writers and reactive readers over the workout-logging store. The writers
 * (`startWorkoutFromDay`, `startEmptyWorkout`, `completeSet`, `updateSet`,
 * `addSet`, `softDeleteSet`, `updateExerciseNotes`, `finishWorkout`,
 * `discardWorkout`) are plain functions — they mutate the Legend-State
 * observables directly and return synchronously, they are not React hooks and
 * carry no hook-naming prefix. `useWorkout` is the one reactive hook here,
 * built on `use$` (Task 2's installed alias for `@legendapp/state/react`'s
 * `useSelector`): it tracks whichever observable `.get()` calls happen inside
 * its selector, so completing/uncompleting a set, editing notes, etc. all
 * re-render any screen reading `useWorkout` live.
 */

import { use$ } from '@legendapp/state/react';
import type { ProgramDay } from '@/features/programs/types';
import { buildWorkoutFromDay } from './start';
import { generateId, workoutExercises$, workoutSets$, workouts$ } from './store';
import type { SetType, Workout, WorkoutExercise, WorkoutSet } from './types';

// ---------------------------------------------------------------------------
// Mutations (plain functions — not hooks)
// ---------------------------------------------------------------------------

/** Builds a workout + its exercises/sets from a programme day's prescription
 * (via `buildWorkoutFromDay`) and writes all of them into the store. Returns
 * the new workout's id so the caller can navigate to `/workout/[id]`. */
export function startWorkoutFromDay(day: ProgramDay, programDayId: string, userId: string): string {
  const { workout, exercises, sets } = buildWorkoutFromDay(day, {
    userId,
    programDayId,
    now: new Date(),
    idGen: generateId,
  });

  workouts$[workout.id].set(workout);
  for (const exercise of exercises) workoutExercises$[exercise.id].set(exercise);
  for (const set of sets) workoutSets$[set.id].set(set);

  return workout.id;
}

/** Creates a bare workout with no exercises (the "Start empty workout"
 * action) and returns its id. Adding exercises to it is sub-project C's
 * mid-workout exercise editor — out of scope here. */
export function startEmptyWorkout(userId: string): string {
  const nowIso = new Date().toISOString();
  const workout: Workout = {
    id: generateId(),
    user_id: userId,
    title: 'Workout',
    program_day_id: null,
    started_at: nowIso,
    finished_at: null,
    notes: null,
    created_at: nowIso,
    updated_at: nowIso,
    deleted: false,
  };
  workouts$[workout.id].set(workout);
  return workout.id;
}

/** Toggle: stamps `completed_at` with `now` if the set isn't completed,
 * clears it (back to null) if it already is. */
export function completeSet(setId: string, now: Date): void {
  const current = workoutSets$[setId].completed_at.get();
  workoutSets$[setId].assign({
    completed_at: current == null ? now.toISOString() : null,
    updated_at: now.toISOString(),
  });
}

export type SetPatch = Partial<Pick<WorkoutSet, 'weight_kg' | 'reps' | 'duration_seconds' | 'set_type' | 'target'>>;

export function updateSet(setId: string, patch: SetPatch): void {
  workoutSets$[setId].assign({ ...patch, updated_at: new Date().toISOString() });
}

/** Appends a new set to `workoutExerciseId`: copies the last live row's
 * weight/reps/duration/type (or sensible defaults when the exercise has no
 * sets yet), at `position` = that row's position + 1. */
export function addSet(workoutExerciseId: string): void {
  const nowIso = new Date().toISOString();
  const existing = Object.values(workoutSets$.get() ?? {}).filter(
    (s): s is WorkoutSet => !!s && !s.deleted && s.workout_exercise_id === workoutExerciseId,
  );
  const last = existing.length > 0 ? existing.reduce((a, b) => (a.position > b.position ? a : b)) : null;

  const newSet: WorkoutSet = {
    id: generateId(),
    user_id: last?.user_id ?? workoutExercises$[workoutExerciseId].user_id.get(),
    workout_exercise_id: workoutExerciseId,
    position: (last?.position ?? 0) + 1,
    set_type: last?.set_type ?? 'working',
    weight_kg: last?.weight_kg ?? null,
    reps: last?.reps ?? null,
    duration_seconds: last?.duration_seconds ?? null,
    target: last?.target ?? null,
    completed_at: null,
    created_at: nowIso,
    updated_at: nowIso,
    deleted: false,
  };
  workoutSets$[newSet.id].set(newSet);
}

export function softDeleteSet(setId: string): void {
  workoutSets$[setId].assign({ deleted: true, updated_at: new Date().toISOString() });
}

export function updateExerciseNotes(workoutExerciseId: string, notes: string): void {
  workoutExercises$[workoutExerciseId].assign({ notes, updated_at: new Date().toISOString() });
}

export function finishWorkout(id: string, now: Date): void {
  workouts$[id].assign({ finished_at: now.toISOString(), updated_at: now.toISOString() });
}

/** Soft-deletes the workout and every (live) exercise/set under it. */
export function discardWorkout(id: string): void {
  const nowIso = new Date().toISOString();
  workouts$[id].assign({ deleted: true, updated_at: nowIso });

  const exercises = Object.values(workoutExercises$.get() ?? {}).filter(
    (e): e is WorkoutExercise => !!e && !e.deleted && e.workout_id === id,
  );
  for (const exercise of exercises) {
    workoutExercises$[exercise.id].assign({ deleted: true, updated_at: nowIso });
  }

  const exerciseIds = new Set(exercises.map((e) => e.id));
  const sets = Object.values(workoutSets$.get() ?? {}).filter(
    (s): s is WorkoutSet => !!s && !s.deleted && exerciseIds.has(s.workout_exercise_id),
  );
  for (const set of sets) {
    workoutSets$[set.id].assign({ deleted: true, updated_at: nowIso });
  }
}

/** Cycles a set's type on tap, per the design's "W -> 1..n -> drop ->
 * failure" order: warmup -> working (numbered) -> drop -> failure -> back to
 * warmup. Exported so SetRow's tap handler and any tests share one
 * definition of the cycle order. */
export function nextSetType(current: SetType): SetType {
  const order: SetType[] = ['warmup', 'working', 'drop', 'failure'];
  const i = order.indexOf(current);
  return order[(i + 1) % order.length];
}

// ---------------------------------------------------------------------------
// Reactive hook
// ---------------------------------------------------------------------------

export interface WorkoutExerciseWithSets extends WorkoutExercise {
  sets: WorkoutSet[];
}

export interface UseWorkoutResult {
  workout: Workout | null;
  exercises: WorkoutExerciseWithSets[];
}

/** Pure projection used by `useWorkout` below: given plain id-keyed records
 * (whatever `.get()` on the three observables returns at a point in time),
 * returns the workout plus its live exercises/sets, sorted by position. Split
 * out from `useWorkout` so this logic is unit-testable against plain fixture
 * objects, with no React render / `use$` plumbing required in tests. */
export function selectWorkoutView(
  id: string,
  workouts: Record<string, Workout>,
  workoutExercises: Record<string, WorkoutExercise>,
  workoutSets: Record<string, WorkoutSet>,
): UseWorkoutResult {
  const workout = (workouts[id] as Workout | undefined) ?? null;

  const allSets = Object.values(workoutSets).filter((s): s is WorkoutSet => !!s && !s.deleted);

  const exercises = Object.values(workoutExercises)
    .filter((e): e is WorkoutExercise => !!e && !e.deleted && e.workout_id === id)
    .sort((a, b) => a.position - b.position)
    .map((e) => ({
      ...e,
      sets: allSets
        .filter((s) => s.workout_exercise_id === e.id)
        .sort((a, b) => a.position - b.position),
    }));

  return { workout, exercises };
}

/** Reactive read of one workout, its live exercises (sorted by position) and
 * each exercise's live sets (sorted by position). Re-renders on any relevant
 * store write. `workout` is `null` when the id doesn't exist (or the store
 * hasn't loaded it yet). */
export function useWorkout(id: string): UseWorkoutResult {
  return use$(() =>
    selectWorkoutView(id, workouts$.get() ?? {}, workoutExercises$.get() ?? {}, workoutSets$.get() ?? {}),
  );
}
