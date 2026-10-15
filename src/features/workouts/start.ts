/**
 * Pure prefill logic for "Start workout from programme day": turns a
 * `ProgramDay`'s prescription into the `workout` / `workout_exercise` /
 * `workout_set` row payloads the CTA writes. No store import — this file
 * only knows about plain data, so Tasks 4-5 (which do own the store) call
 * it and then write the returned rows into the Legend-State observables
 * themselves.
 */

import type { ProgramDay } from '@/features/programs/types';
import type { Workout, WorkoutExercise, WorkoutSet } from './types';

export interface BuildWorkoutFromDayOpts {
  userId: string;
  programDayId: string;
  now: Date;
  /** Client-generated id source. Defaults to a local UUID-v4-ish generator
   * (no native/store dependency) — callers that already import
   * `workouts/store.ts` should pass its `generateId` explicitly so ids come
   * from one place in the running app. */
  idGen?: () => string;
}

export interface BuildWorkoutFromDayResult {
  workout: Workout;
  exercises: WorkoutExercise[];
  sets: WorkoutSet[];
}

/** No native/crypto dependency on purpose — keeps this module store-free and
 * usable in plain Node/Jest. Production callers inject the real `generateId`
 * (expo-crypto `randomUUID`) from `workouts/store.ts` via `idGen`. */
function fallbackIdGen(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Matches reps/duration text that denotes TIME, not count or distance:
// "30–45 s", "20 s/side", "30 s". Deliberately does NOT match "30 m"/"25 m"
// (distance, not time) nor "...single" (ends in a vowel, not a bare "s").
const TIMED_PRESCRIPTION_RE = /\bs(?:\/side)?$/i;

/** Does this DayExercise's `reps` text describe a timed hold rather than a
 * rep count or a distance? Drives the duration-vs-weighted set shape and
 * the rest-timer default. */
export function isTimedPrescription(reps: string | null): boolean {
  if (!reps) return false;
  return TIMED_PRESCRIPTION_RE.test(reps.trim());
}

/** Prescribed reps as a startable number, or null when the prescription
 * isn't a plain count.
 *
 * A single count ("3", "12 reps") prefills so the lifter only edits weight.
 * Ranges ("12-15") prefill their LOW end — the number you're committed to —
 * and anything non-numeric (timed holds, "Max") or distance-shaped ("30 m")
 * stays blank, with the prescription still visible as ghost text.
 */
export function prefillReps(reps: string | null): number | null {
  if (!reps) return null;
  if (isTimedPrescription(reps)) return null;
  if (/\d\s*m\b/i.test(reps)) return null;
  const match = reps.trim().match(/^(\d+)/);
  if (!match) return null;
  const value = Number(match[1]);
  return value > 0 ? value : null;
}

/** Human ghost text shown on each set row, e.g. "4 × 2 @ 85%" or, when the
 * programme has no load column for this row, "2 × 20 s/side". */
export function composeTarget(sets: number, reps: string | null, load: string | null): string {
  const core = reps ? `${sets} × ${reps}` : `${sets} sets`;
  return load ? `${core} @ ${load}` : core;
}

export function buildWorkoutFromDay(
  day: ProgramDay,
  opts: BuildWorkoutFromDayOpts,
): BuildWorkoutFromDayResult {
  const idGen = opts.idGen ?? fallbackIdGen;
  const nowIso = opts.now.toISOString();

  const workout: Workout = {
    id: idGen(),
    user_id: opts.userId,
    title: day.name,
    program_day_id: opts.programDayId,
    started_at: nowIso,
    finished_at: null,
    notes: null,
    created_at: nowIso,
    updated_at: nowIso,
    deleted: false,
  };

  const exercises: WorkoutExercise[] = [];
  const sets: WorkoutSet[] = [];

  for (const dayExercise of day.exercises) {
    const timed = isTimedPrescription(dayExercise.reps);
    const setCount = dayExercise.sets ?? 1;
    const target = composeTarget(setCount, dayExercise.reps, dayExercise.load);

    const workoutExercise: WorkoutExercise = {
      id: idGen(),
      user_id: opts.userId,
      workout_id: workout.id,
      exercise_id: dayExercise.exerciseId,
      exercise_name: dayExercise.exerciseName,
      position: dayExercise.position,
      rest_seconds: timed ? null : 150,
      notes: dayExercise.notes ?? null,
      created_at: nowIso,
      updated_at: nowIso,
      deleted: false,
    };
    exercises.push(workoutExercise);

    for (let i = 0; i < setCount; i++) {
      sets.push({
        id: idGen(),
        user_id: opts.userId,
        workout_exercise_id: workoutExercise.id,
        position: i + 1,
        set_type: 'working',
        weight_kg: null,
        reps: prefillReps(dayExercise.reps),
        duration_seconds: null,
        target,
        completed_at: null,
        created_at: nowIso,
        updated_at: nowIso,
        deleted: false,
      });
    }
  }

  return { workout, exercises, sets };
}
