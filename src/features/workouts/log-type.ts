import type { LogType, WorkoutExercise, WorkoutSet } from './types';

/**
 * How an exercise is logged, which decides the set table's columns:
 * - `weight_reps`: KG and REPS (squats, presses).
 * - `reps`: REPS only (jumps, bodyweight pull-ups).
 * - `duration`: TIME, with the play button (holds, sprints).
 *
 * The coach sets it when it writes a plan; anything without one (older
 * programmes, hand-added rows) is inferred here from the name and the
 * prescription. Changing it mid-workout is the ⋯ menu's "Log as…".
 */

export const LOG_TYPES: readonly LogType[] = ['weight_reps', 'reps', 'duration'];

export const LOG_TYPE_LABELS: Record<LogType, string> = {
  weight_reps: 'Weight & reps',
  reps: 'Reps only',
  duration: 'Time',
};

export function isLogType(value: unknown): value is LogType {
  return typeof value === 'string' && (LOG_TYPES as readonly string[]).includes(value);
}

// "30 s", "20 s/side": a hold.
const TIMED_RE = /\bs(?:\/side)?$/i;
// "20 m", "4 × 30m": a distance, run rather than lifted.
const DISTANCE_RE = /\d\s*m\b/i;
const TIMED_NAME_RE = /\b(sprint|sprints|run|shuttle|plank|hold|iso|wall sit|dead hang|carry)\b/i;
const REPS_NAME_RE =
  /\b(jump|jumps|hop|hops|bound|bounds|pogo|pogos|skip|skips|push[- ]?ups?|pull[- ]?ups?|chin[- ]?ups?|dips?|burpees?|sit[- ]?ups?|crunch(es)?|lunge jumps?)\b/i;

/** Best guess from a programme row: timed prescriptions and distances are
 * timed, so are sprints and holds by name; plyos and bodyweight moves are
 * reps only unless they say "weighted"; everything else is weight & reps. */
export function inferLogType(name: string, reps: string | null): LogType {
  const prescription = reps?.trim() ?? '';
  if (TIMED_RE.test(prescription) || DISTANCE_RE.test(prescription)) return 'duration';
  if (TIMED_NAME_RE.test(name)) return 'duration';
  if (REPS_NAME_RE.test(name) && !/weighted/i.test(name)) return 'reps';
  return 'weight_reps';
}

// Older rows carry no type: read it off what's logged, then the ghost text.
const TIMED_TARGET_RE = /\d+\s*s(?:\/side)?\b/i;

/** The type a live exercise's table uses. Rows from before types existed
 * fall back to what's been logged (a duration means timed, weight or reps
 * means weighted) and then to the prescription's shape. */
export function logTypeOf(exercise: WorkoutExercise & { sets: WorkoutSet[] }): LogType {
  if (exercise.log_type != null) return exercise.log_type;
  if (exercise.sets.some((s) => s.duration_seconds != null)) return 'duration';
  if (exercise.sets.some((s) => s.weight_kg != null || s.reps != null)) return 'weight_reps';
  return exercise.sets.some((s) => s.target != null && TIMED_TARGET_RE.test(s.target)) ? 'duration' : 'weight_reps';
}
