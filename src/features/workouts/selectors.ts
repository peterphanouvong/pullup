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

import type { Exercise, Workout, WorkoutExercise, WorkoutSet } from './types';

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
    // `!!w.id` guards against ghost rows: an `assign` on a stale id creates a
    // partial object (e.g. `{finished_at}`) with no id, which would render a
    // key-less Activities row.
    .filter((w): w is Workout => !!w && !!w.id && !w.deleted && w.finished_at != null)
    .sort((a, b) => new Date(b.finished_at as string).getTime() - new Date(a.finished_at as string).getTime());
}

/** The unfinished (`finished_at == null`), non-deleted workout to offer
 * resuming — most recent by `started_at` when more than one exists (e.g. an
 * empty workout started, abandoned, then a day workout started after it). */
export function activeWorkout(workouts: Record<string, Workout>): Workout | null {
  const candidates = Object.values(workouts).filter(
    (w): w is Workout => !!w && !!w.id && !w.deleted && w.finished_at == null,
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((latest, w) =>
    new Date(w.started_at).getTime() > new Date(latest.started_at).getTime() ? w : latest,
  );
}

/** Does a finished (non-deleted) workout exist for this programme day? Feeds
 * the Today day-card's completed checkmark. */
export function hasFinishedWorkoutForDay(workouts: Record<string, Workout>, programDayId: string): boolean {
  return Object.values(workouts).some(
    (w) => !w.deleted && w.finished_at != null && w.program_day_id === programDayId,
  );
}

export interface FinishedWorkoutSummary {
  workout: Workout;
  summary: WorkoutSummary;
}

/** Finished workouts newest-first, each paired with its `workoutSummary` —
 * the Activities tab's feed. */
export function finishedWorkoutSummaries(
  workouts: Record<string, Workout>,
  workoutExercises: Record<string, WorkoutExercise>,
  workoutSets: Record<string, WorkoutSet>,
): FinishedWorkoutSummary[] {
  return finishedWorkoutsNewestFirst(workouts).map((workout) => {
    const exercises = Object.values(workoutExercises).filter(
      (e): e is WorkoutExercise => !!e && e.workout_id === workout.id,
    );
    const exerciseIds = new Set(exercises.map((e) => e.id));
    const sets = Object.values(workoutSets).filter(
      (s): s is WorkoutSet => !!s && exerciseIds.has(s.workout_exercise_id),
    );
    return { workout, summary: workoutSummary(workout, exercises, sets) };
  });
}

/** The exercise the lifter is "on" for the minimized-workout bar: the first
 * live exercise (by position) that still has an incomplete live set, falling
 * back to the last live exercise, or null for an empty workout. */
export function currentExerciseName(
  workoutId: string,
  workoutExercises: Record<string, WorkoutExercise>,
  workoutSets: Record<string, WorkoutSet>,
): string | null {
  const live = Object.values(workoutExercises)
    .filter((e): e is WorkoutExercise => !!e && !!e.id && !e.deleted && e.workout_id === workoutId)
    .sort((a, b) => a.position - b.position);
  if (live.length === 0) return null;

  const liveIds = new Set(live.map((e) => e.id));
  const withIncompleteSet = new Set(
    Object.values(workoutSets)
      .filter(
        (s): s is WorkoutSet =>
          !!s && !s.deleted && liveIds.has(s.workout_exercise_id) && s.completed_at == null,
      )
      .map((s) => s.workout_exercise_id),
  );
  return (live.find((e) => withIncompleteSet.has(e.id)) ?? live[live.length - 1]).exercise_name;
}

/** `mm:ss` under an hour, `h:mm` (no seconds) at an hour or more — the
 * summary/Activities duration format. */
/** The start and finish a workout is saved with. The Save step lets you
 * move the start (logging yesterday's session today); the duration you
 * actually trained is kept, so the finish moves with it. These are instants,
 * not calendar days, so ISO strings are right here. */
export function savedTimes(
  originalStartIso: string,
  chosenStart: Date,
  now: Date,
): { started_at: string; finished_at: string } {
  const durationMs = Math.max(0, now.getTime() - new Date(originalStartIso).getTime());
  return {
    started_at: chosenStart.toISOString(),
    finished_at: new Date(chosenStart.getTime() + durationMs).toISOString(),
  };
}

export function formatWorkoutDuration(totalSeconds: number): string {
  const clamped = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Day-of-month + short month label for an Activities `NumeralRow`, read off
 * the local calendar (hand-rolled rather than `toLocaleDateString` — no ICU
 * data dependency under Hermes). */
export function activityDateLabel(isoTimestamp: string): { day: number; month: string } {
  const d = new Date(isoTimestamp);
  return { day: d.getDate(), month: MONTH_LABELS[d.getMonth()] };
}

/** "mm:ss · N kg · N sets" caption for an Activities row. */
export function activityMetaLabel(durationSeconds: number, volumeKg: number, completedCount: number): string {
  const sets = completedCount === 1 ? 'set' : 'sets';
  return `${formatWorkoutDuration(durationSeconds)} · ${Math.round(volumeKg)} kg · ${completedCount} ${sets}`;
}

/** Strip diacritics and lowercase, for accent-insensitive contains matching
 * (e.g. query "romana" matches "Românian deadlift"). NFD splits each
 * accented letter into base + combining mark; stripping the Unicode
 * Combining Diacritical Marks block (U+0300-U+036F) then drops just the
 * accents. */
function normalizeForSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Exercise-picker search: name contains `query` (case/diacritic-insensitive),
 * optionally narrowed to an exact `muscle_group` when `group` is non-null,
 * excluding deleted library rows, alphabetical by name.
 */
export function searchExercises(
  exercises: Record<string, Exercise>,
  query: string,
  group: string | null,
): Exercise[] {
  const needle = normalizeForSearch(query);
  return Object.values(exercises)
    .filter((e) => !e.deleted)
    .filter((e) => group == null || e.muscle_group === group)
    .filter((e) => normalizeForSearch(e.name).includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Distinct `exercise_id`s (non-null) from the user's FINISHED, non-deleted
 * workouts' non-deleted exercises, newest-finished-first, capped at `cap` —
 * the exercise-picker "Recent" section. An id's position is driven by its
 * most recent occurrence; an exercise logged in an older workout too doesn't
 * get re-ordered older by that earlier appearance.
 */
export function recentExerciseIds(
  workouts: Record<string, Workout>,
  workoutExercises: Record<string, WorkoutExercise>,
  cap: number,
): string[] {
  const finishedWorkouts = finishedWorkoutsNewestFirst(workouts);
  const finishedOrder = new Map(finishedWorkouts.map((w, i) => [w.id, i]));

  const liveExercises = Object.values(workoutExercises)
    .filter((we) => !we.deleted && we.exercise_id != null && finishedOrder.has(we.workout_id))
    .sort((a, b) => (finishedOrder.get(a.workout_id) as number) - (finishedOrder.get(b.workout_id) as number));

  const seen = new Set<string>();
  const result: string[] = [];
  for (const we of liveExercises) {
    const exerciseId = we.exercise_id as string;
    if (seen.has(exerciseId)) continue;
    seen.add(exerciseId);
    result.push(exerciseId);
    if (result.length >= cap) break;
  }
  return result;
}
