/**
 * Writers and reactive readers over the workout-logging store. The writers
 * (`startWorkoutFromDay`, `startEmptyWorkout`, `completeSet`, `updateSet`,
 * `addSet`, `softDeleteSet`, `updateExerciseNotes`, `finishWorkout`,
 * `discardWorkout`) are plain functions — they mutate the Legend-State
 * observables directly and return synchronously, they are not React hooks and
 * carry no hook-naming prefix. `useWorkout` is the one reactive hook here,
 * built on `useSelector` (Task 2's installed alias for `@legendapp/state/react`'s
 * `useSelector`): it tracks whichever observable `.get()` calls happen inside
 * its selector, so completing/uncompleting a set, editing notes, etc. all
 * re-render any screen reading `useWorkout` live.
 */

import { haptics } from '@/lib/haptics';
import { useSelector } from '@legendapp/state/react';
import type { ProgramDay } from '@/features/programs/types';
import { buildAddedExercise, buildReplacement, moveExercise } from './edit';
import { skipRestTimer, startRestTimer } from './rest-timer';
import {
  activeWorkout,
  currentExerciseName,
  finishedWorkoutSummaries,
  hasFinishedWorkoutForDay,
  recentExerciseIds,
  savedTimes,
  searchExercises,
  type FinishedWorkoutSummary,
} from './selectors';
import { buildWorkoutFromDay } from './start';
import { weekCompletion } from './today-state';
import { shortVersionOf } from './short-version';
import { exercises$, generateId, workoutExercises$, workoutSets$, workouts$ } from './store';
import type { Exercise, SetType, Workout, WorkoutExercise, WorkoutSet } from './types';

// ---------------------------------------------------------------------------
// Mutations (plain functions — not hooks)
// ---------------------------------------------------------------------------

/** Builds a workout + its exercises/sets from a programme day's prescription
 * (via `buildWorkoutFromDay`) and writes all of them into the store. Returns
 * the new workout's id so the caller can navigate to `/workout/[id]`. */
export function startWorkoutFromDay(day: ProgramDay, programDayId: string, userId: string): string {
  haptics.commit();
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

/** Starts the flat-day cut of a programme day (see `short-version.ts`).
 * Logged against the same day, so it completes the day and counts for the
 * week and the crew: the habit matters more than the full session. */
export function startShortWorkoutFromDay(day: ProgramDay, programDayId: string, userId: string): string | null {
  const short = shortVersionOf(day);
  if (!short) return null;
  return startWorkoutFromDay({ ...short.day, name: `${day.name} · ${short.minutes} min` }, programDayId, userId);
}

/** Creates a bare workout with no exercises (the "Start empty workout"
 * action) and returns its id. Adding exercises to it is sub-project C's
 * mid-workout exercise editor — out of scope here. */
export function startEmptyWorkout(userId: string): string {
  haptics.commit();
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
 * clears it (back to null) if it already is. Completing (not un-completing)
 * auto-starts the rest timer when the set's exercise has `rest_seconds` set —
 * a null/0 `rest_seconds` ("OFF") never starts one. */
export function completeSet(setId: string, now: Date): void {
  if (workoutSets$[setId].peek() == null) return;
  const current = workoutSets$[setId].completed_at.get();
  const completing = current == null;
  workoutSets$[setId].assign({
    completed_at: completing ? now.toISOString() : null,
    updated_at: now.toISOString(),
  });

  if (completing) {
    const workoutExerciseId = workoutSets$[setId].workout_exercise_id.get();
    const restSeconds = workoutExercises$[workoutExerciseId]?.rest_seconds.get();
    if (restSeconds != null && restSeconds > 0) {
      startRestTimer(restSeconds, now);
    }
  }
}

export type SetPatch = Partial<Pick<WorkoutSet, 'weight_kg' | 'reps' | 'duration_seconds' | 'set_type' | 'target'>>;

export function updateSet(setId: string, patch: SetPatch): void {
  if (workoutSets$[setId].peek() == null) return;
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
  haptics.tap();
}

export function softDeleteSet(setId: string): void {
  if (workoutSets$[setId].peek() == null) return;
  workoutSets$[setId].assign({ deleted: true, updated_at: new Date().toISOString() });
  haptics.commit();
}

export function updateExerciseNotes(workoutExerciseId: string, notes: string): void {
  if (workoutExercises$[workoutExerciseId].peek() == null) return;
  workoutExercises$[workoutExerciseId].assign({ notes, updated_at: new Date().toISOString() });
}

/** Writes the exercise's rest-timer preset (`null` = OFF) — the exercise
 * card's "Rest Timer: …" row preset chooser. */
export function updateExerciseRestSeconds(workoutExerciseId: string, restSeconds: number | null): void {
  if (workoutExercises$[workoutExerciseId].peek() == null) return;
  workoutExercises$[workoutExerciseId].assign({ rest_seconds: restSeconds, updated_at: new Date().toISOString() });
  haptics.select();
}

export function finishWorkout(id: string, now: Date): void {
  // Guard every assign-style mutation: Legend-State's `assign` on an id with
  // no row CREATES a partial object (no id/user_id) — a ghost row that can
  // never sync and renders as a key-less Activities entry.
  if (workouts$[id].peek() == null) return;
  // After the guard: the success tap should mark a workout that actually
  // finished, not a no-op.
  haptics.success();
  workouts$[id].assign({ finished_at: now.toISOString(), updated_at: now.toISOString() });
  // A rest timer from the just-finished workout's last set must not keep
  // counting down (or reappear) once the workout is over.
  skipRestTimer();
}

/** The Save step's commit: writes the edited name, description and start,
 * then marks the workout finished. A blank name keeps the old one; a blank
 * description clears it. `updated_at` is the real save time even when the
 * start moved into the past, since sync orders writes by it. */
export function saveWorkout(
  id: string,
  details: { title: string; notes: string; startedAt: Date },
  now: Date,
): void {
  const workout = workouts$[id].peek();
  if (workout == null) return;
  const times = savedTimes(workout.started_at, details.startedAt, now);
  haptics.success();
  workouts$[id].assign({
    title: details.title.trim() || workout.title,
    notes: details.notes.trim() || null,
    started_at: times.started_at,
    finished_at: times.finished_at,
    updated_at: now.toISOString(),
  });
  skipRestTimer();
}

/** Soft-deletes the workout, every live exercise under it, and every live set
 * under *all* of its exercises — including exercises already soft-deleted
 * before this call (sub-project C's mid-workout exercise editor can leave
 * one behind with still-live sets; scoping the sets cascade to only the
 * currently-live exercises would silently skip those). */
export function discardWorkout(id: string): void {
  if (workouts$[id].peek() == null) return;
  const nowIso = new Date().toISOString();
  workouts$[id].assign({ deleted: true, updated_at: nowIso });
  // A rest timer started mid-workout must not survive discarding it.
  skipRestTimer();

  const allExercises = Object.values(workoutExercises$.get() ?? {}).filter(
    (e): e is WorkoutExercise => !!e && e.workout_id === id,
  );
  for (const exercise of allExercises) {
    if (exercise.deleted) continue;
    workoutExercises$[exercise.id].assign({ deleted: true, updated_at: nowIso });
  }

  const exerciseIds = new Set(allExercises.map((e) => e.id));
  const sets = Object.values(workoutSets$.get() ?? {}).filter(
    (s): s is WorkoutSet => !!s && !s.deleted && exerciseIds.has(s.workout_exercise_id),
  );
  for (const set of sets) {
    workoutSets$[set.id].assign({ deleted: true, updated_at: nowIso });
  }
}

/** "Add Exercise": appends a new `workout_exercise` row for `exercise` at
 * position = (max position over ALL of the workout's exercises, including
 * soft-deleted ones) + 1, plus its one empty working set. Scanning *all*
 * rows (not just live ones) means a gap left by a removed exercise's old
 * position is never reused. */
export function addExerciseToWorkout(workoutId: string, userId: string, exercise: Exercise): void {
  const allExercisesForWorkout = Object.values(workoutExercises$.get() ?? {}).filter(
    (e): e is WorkoutExercise => !!e && e.workout_id === workoutId,
  );
  const maxPosition = allExercisesForWorkout.reduce((max, e) => Math.max(max, e.position), 0);

  const { exercise: newExercise, set } = buildAddedExercise({
    workoutId,
    userId,
    exercise,
    position: maxPosition + 1,
    now: new Date(),
    idGen: generateId,
  });

  workoutExercises$[newExercise.id].set(newExercise);
  workoutSets$[set.id].set(set);
  haptics.tap();
}

/** "Replace exercise": swaps the SAME `workout_exercise` row's identity
 * (`exercise_id` + `exercise_name` snapshot) for the newly-picked library
 * exercise. Sets, notes, and rest_seconds are untouched — `buildReplacement`
 * never mentions them. */
export function replaceExercise(workoutExerciseId: string, exercise: Exercise): void {
  if (workoutExercises$[workoutExerciseId].peek() == null) return;
  workoutExercises$[workoutExerciseId].assign({
    ...buildReplacement(exercise),
    updated_at: new Date().toISOString(),
  });
  haptics.tap();
}

/** "Remove exercise": soft-deletes the `workout_exercise` row and every live
 * set under it — mirrors `discardWorkout`'s cascade discipline, just scoped
 * to one exercise instead of the whole workout. Confirmation is the call
 * site's concern (the ⋮ menu's destructive Alert). */
export function removeExercise(workoutExerciseId: string): void {
  if (workoutExercises$[workoutExerciseId].peek() == null) return;
  haptics.commit();
  const nowIso = new Date().toISOString();
  workoutExercises$[workoutExerciseId].assign({ deleted: true, updated_at: nowIso });

  const sets = Object.values(workoutSets$.get() ?? {}).filter(
    (s): s is WorkoutSet => !!s && !s.deleted && s.workout_exercise_id === workoutExerciseId,
  );
  for (const set of sets) {
    workoutSets$[set.id].assign({ deleted: true, updated_at: nowIso });
  }
}

/** "Move up"/"Move down": re-derives the workout's visible (non-deleted),
 * position-sorted exercise list from the store, then applies whatever
 * position writes `moveExercise` returns (empty at the ends, or when
 * `workoutExerciseId` is unknown). */
export function moveExerciseInWorkout(workoutId: string, workoutExerciseId: string, dir: 'up' | 'down'): void {
  const visibleSorted = Object.values(workoutExercises$.get() ?? {})
    .filter((e): e is WorkoutExercise => !!e && !e.deleted && e.workout_id === workoutId)
    .sort((a, b) => a.position - b.position);

  const writes = moveExercise(visibleSorted, workoutExerciseId, dir);
  // Empty at either end of the list: nothing moved, so nothing to feel.
  if (writes.length > 0) haptics.select();
  const nowIso = new Date().toISOString();
  for (const write of writes) {
    workoutExercises$[write.id].assign({ position: write.position, updated_at: nowIso });
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
 * objects, with no React render / `useSelector` plumbing required in tests. */
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
  return useSelector(() =>
    selectWorkoutView(id, workouts$.get() ?? {}, workoutExercises$.get() ?? {}, workoutSets$.get() ?? {}),
  );
}

/** The unfinished workout to offer resuming (Today's resume banner, and the
 * new-workout guard), or `null` when none is in progress. Re-renders on any
 * workout write. */
export function useActiveWorkout(): Workout | null {
  return useSelector(() => activeWorkout(workouts$.get() ?? {}));
}

/** Whether a finished (non-deleted) workout exists for `programDayId` — the
 * Today day-card's completed checkmark. `null` (no day selected) is always
 * `false`. */
export function useHasFinishedWorkoutForDay(programDayId: string | null): boolean {
  return useSelector(() =>
    programDayId != null ? hasFinishedWorkoutForDay(workouts$.get() ?? {}, programDayId) : false,
  );
}

/** Which of the given programme days already have a finished workout — the
 * Today week checklist's checkmarks and progress segments. */
export function useWeekCompletion(dayIds: string[]): Record<string, boolean> {
  return useSelector(() => weekCompletion(workouts$.get() ?? {}, dayIds));
}

/** Finished workouts newest-first, each with its `workoutSummary` — the
 * Activities tab's feed. */
export function useFinishedWorkouts(): FinishedWorkoutSummary[] {
  return useSelector(() =>
    finishedWorkoutSummaries(workouts$.get() ?? {}, workoutExercises$.get() ?? {}, workoutSets$.get() ?? {}),
  );
}

/** The minimized-workout bar's subtitle: the exercise the lifter is on. */
export function useCurrentExerciseName(workoutId: string): string | null {
  return useSelector(() =>
    currentExerciseName(workoutId, workoutExercises$.get() ?? {}, workoutSets$.get() ?? {}),
  );
}

/** Exercise-picker search: name contains `query`, optionally narrowed to
 * `group` — a thin reactive wrapper over `searchExercises`. */
export function useExerciseSearch(query: string, group: string | null): Exercise[] {
  return useSelector(() => searchExercises(exercises$.get() ?? {}, query, group));
}

/** Exercise-picker "Recent" section: up to 8 distinct exercises from the
 * user's finished workouts, newest-first, resolved to their library rows
 * (skipping any id that no longer resolves to a live `Exercise`). */
export function useRecentExercises(): Exercise[] {
  return useSelector(() => {
    const ids = recentExerciseIds(workouts$.get() ?? {}, workoutExercises$.get() ?? {}, 8);
    const exercisesRecord = exercises$.get() ?? {};
    return ids
      .map((id) => exercisesRecord[id] as Exercise | undefined)
      .filter((e): e is Exercise => !!e && !e.deleted);
  });
}
