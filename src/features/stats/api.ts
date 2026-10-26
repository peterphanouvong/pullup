import { supabase } from '@/lib/supabase';
import type { Workout, WorkoutExercise, WorkoutSet } from '@/features/workouts/types';

/** How far back a crewmate's profile looks: the chart's twelve weeks, plus
 * a margin so the oldest bar's records have something to beat. */
export const PERSON_HISTORY_WEEKS = 16;

const PAGE = 1000;

/** PostgREST returns at most a thousand rows a request; a few months of
 * sets can be more. */
async function fetchAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE) return rows;
  }
}

/**
 * A crewmate's recent training, as rows. RLS only lets these through for
 * someone you share a crew with, and only finished work
 * (`20261026010000_crew_profiles.sql`). Filtered by `created_at` rather
 * than by workout id, so the request stays small however much they train.
 */
export async function fetchPersonLog(userId: string, now: Date) {
  const since = new Date(now.getTime() - PERSON_HISTORY_WEEKS * 7 * 86_400_000).toISOString();
  const [workouts, exercises, sets] = await Promise.all([
    fetchAll<Workout>((from, to) =>
      supabase.from('workouts').select('*').eq('user_id', userId).gte('started_at', since).range(from, to),
    ),
    fetchAll<WorkoutExercise>((from, to) =>
      supabase.from('workout_exercises').select('*').eq('user_id', userId).gte('created_at', since).range(from, to),
    ),
    fetchAll<WorkoutSet>((from, to) =>
      supabase.from('workout_sets').select('*').eq('user_id', userId).gte('created_at', since).range(from, to),
    ),
  ]);
  return { workouts, exercises, sets };
}
