/**
 * Row shapes mirroring the `exercises`, `workouts`, `workout_exercises`, and
 * `workout_sets` Postgres tables column-for-column (snake_case, as
 * PostgREST/Supabase realtime hand them to us). Legend-State's
 * `syncedSupabase` plugin syncs these raw rows directly into object-keyed
 * observables — there is no camelCase mapping layer, so these interfaces
 * must track the DB schema exactly (see
 * supabase/migrations/20261014030000_workout_schema.sql).
 */

export type SetType = 'warmup' | 'working' | 'drop' | 'failure';

/** Which columns a set table shows; see `log-type.ts`. */
export type LogType = 'weight_reps' | 'reps' | 'duration';

export interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

export interface Workout {
  id: string;
  user_id: string;
  title: string;
  program_day_id: string | null;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

export interface WorkoutExercise {
  id: string;
  user_id: string;
  workout_id: string;
  exercise_id: string | null;
  exercise_name: string;
  position: number;
  rest_seconds: number | null;
  /** Optional: rows written before the column existed have none, and
   * `logTypeOf` infers one for them. */
  log_type?: LogType | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

export interface WorkoutSet {
  id: string;
  user_id: string;
  workout_exercise_id: string;
  position: number;
  set_type: SetType;
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  target: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}
