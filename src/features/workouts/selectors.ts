/**
 * Pure read-side logic over the workout row shapes: volume, completed-set
 * count, elapsed duration, previous-session ghosting, per-workout summary
 * and the finished-workouts feed. No store import — callers pass plain
 * records/arrays (whether pulled live from the Legend-State observables in
 * `workouts/store.ts` or from a test fixture).
 *
 * Deleted rows (`deleted: true`) are ignored everywhere, per the plan's
 * global constraint — every selector here filters them out itself rather
 * than trusting the caller to have done so.
 */

import type { Workout, WorkoutExercise, WorkoutSet } from './types';

const isLiveSet = (s: WorkoutSet) => !s.deleted;
const isCompleted = (s: WorkoutSet) => isLiveSet(s) && s.completed_at != null;

/** Σ weight_kg × reps over completed, non-deleted sets. Sets missing either
 * value (timed/duration sets) contribute 0, not NaN. */
export function workoutVolumeKg(sets: WorkoutSet[]): number {
  return sets
    .filter(isCompleted)
    .reduce((total, s) => total + (s.weight_kg ?? 0) * (s.reps ?? 0), 0);
}

/** Count of completed, non-deleted sets. */
export function completedSetCount(sets: WorkoutSet[]): number {
  return sets.filter(isCompleted).length;
}

/** Elapsed seconds: `finished_at - started_at` once finished (ignoring
 * `now`); otherwise `now - started_at` for an in-progress workout. */
export function elapsedSeconds(workout: Workout, now: Date): number {
  const started = new Date(workout.started_at).getTime();
  const end = workout.finished_at ? new Date(workout.finished_at).getTime() : now.getTime();
  return Math.round((end - started) / 1000);
}

export interface PreviousSetArgs {
  exerciseId: string;
  position: number;
  currentWorkoutId: string;
  workouts: Record<string, Workout>;
  workoutExercises: Record<string, WorkoutExercise>;
  sets: Record<string, WorkoutSet>;
}

/**
 * The same-position set from the user's most recent *finished* workout
 * containing `exerciseId` (excluding the current workout). Walks finished
 * workouts newest-first and returns the first live set found at `position`
 * for that exercise; a workout that logged the exercise but has nothing at
 * that exact position (fewer sets that session, or the row was individually
 * soft-deleted) is skipped in favor of the next most recent one.
 */
export function previousSet(args: PreviousSetArgs): WorkoutSet | null {
  const { exerciseId, position, currentWorkoutId, workouts, workoutExercises, sets } = args;

  const candidateWorkouts = Object.values(workouts)
    .filter((w) => !w.deleted && w.finished_at != null && w.id !== currentWorkoutId)
    .sort((a, b) => new Date(b.finished_at as string).getTime() - new Date(a.finished_at as string).getTime());

  for (const w of candidateWorkouts) {
    const matchingExercises = Object.values(workoutExercises).filter(
      (we) => !we.deleted && we.workout_id === w.id && we.exercise_id === exerciseId,
    );
    if (matchingExercises.length === 0) continue;

    const matchingExerciseIds = new Set(matchingExercises.map((we) => we.id));
    const match = Object.values(sets).find(
      (s) => !s.deleted && matchingExerciseIds.has(s.workout_exercise_id) && s.position === position,
    );
    // This workout logged the exercise but not at this exact position (e.g.
    // it had fewer sets, or the set at this position was itself soft-
    // deleted) — fall back to the next most recent qualifying workout
    // rather than giving up.
    if (match) return match;
  }

  return null;
}

export interface WorkoutSummary {
  durationSeconds: number;
  volumeKg: number;
  completedCount: number;
  perExercise: { exerciseName: string; bestSet: WorkoutSet | null }[];
}

/** Heaviest completed set wins; ties broken by higher reps. Missing values
 * sort low (never beat a set that actually has a weight/rep logged). */
function isBetterSet(candidate: WorkoutSet, current: WorkoutSet): boolean {
  const cw = candidate.weight_kg ?? -Infinity;
  const kw = current.weight_kg ?? -Infinity;
  if (cw !== kw) return cw > kw;
  const cr = candidate.reps ?? -Infinity;
  const kr = current.reps ?? -Infinity;
  return cr > kr;
}

function bestCompletedSet(sets: WorkoutSet[]): WorkoutSet | null {
  const completed = sets.filter(isCompleted);
  if (completed.length === 0) return null;
  return completed.reduce((best, s) => (isBetterSet(s, best) ? s : best));
}

/** Duration/volume/completed-count header plus a per-exercise best-set
 * breakdown, in exercise position order. Deleted exercises and deleted sets
 * are excluded throughout. */
export function workoutSummary(
  workout: Workout,
  exercises: WorkoutExercise[],
  sets: WorkoutSet[],
): WorkoutSummary {
  const liveExercises = [...exercises.filter((e) => !e.deleted)].sort((a, b) => a.position - b.position);
  const liveExerciseIds = new Set(liveExercises.map((e) => e.id));
  // Scope to sets whose exercise is still live — a soft-deleted exercise's
  // sets shouldn't count toward volume/completed-count even if the set rows
  // themselves were never individually deleted.
  const liveSets = sets.filter((s) => isLiveSet(s) && liveExerciseIds.has(s.workout_exercise_id));

  return {
    durationSeconds: elapsedSeconds(workout, new Date()),
    volumeKg: workoutVolumeKg(liveSets),
    completedCount: completedSetCount(liveSets),
    perExercise: liveExercises.map((ex) => ({
      exerciseName: ex.exercise_name,
      bestSet: bestCompletedSet(liveSets.filter((s) => s.workout_exercise_id === ex.id)),
    })),
  };
}

/** Finished (not deleted) workouts, newest `finished_at` first. */
export function finishedWorkoutsNewestFirst(workouts: Record<string, Workout>): Workout[] {
  return Object.values(workouts)
    .filter((w) => !w.deleted && w.finished_at != null)
    .sort((a, b) => new Date(b.finished_at as string).getTime() - new Date(a.finished_at as string).getTime());
}
