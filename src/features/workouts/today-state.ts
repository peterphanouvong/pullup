/**
 * Pure state derivations for the Today v2 screen (Nike-style week checklist
 * + context-aware floating action). No store imports — screens feed store
 * snapshots in; tests feed fixtures.
 */

import type { ProgramDay } from '@/features/programs/types';
import type { Workout } from './types';

/** Visual state of one week-list row. Today-ness is orthogonal (a day can be
 * both today and done) — callers derive `isToday` from positions. */
export type TodayDayState = 'done' | 'missed' | 'upcoming' | 'info';

/** Which programme days already have a finished (non-deleted) workout. */
export function weekCompletion(
  workouts: Record<string, Workout>,
  dayIds: string[],
): Record<string, boolean> {
  const wanted = new Set(dayIds);
  const done = new Set<string>();
  for (const w of Object.values(workouts)) {
    if (!w || w.deleted || w.finished_at == null) continue;
    if (w.program_day_id != null && wanted.has(w.program_day_id)) done.add(w.program_day_id);
  }
  const result: Record<string, boolean> = {};
  for (const id of dayIds) result[id] = done.has(id);
  return result;
}

/** Row state: only lifting days complete or go missed; court/rest/comp days
 * are informational regardless of date. 'missed' never applies to today or
 * the future. */
export function dayState(day: ProgramDay, todayPosition: number, completed: boolean): TodayDayState {
  if (day.kind !== 'lifting') return 'info';
  if (completed) return 'done';
  if (day.position < todayPosition) return 'missed';
  return 'upcoming';
}

export type FloatingActionState =
  | { kind: 'resume'; workoutId: string }
  | { kind: 'startToday' }
  | { kind: 'startEmpty' };

/** The floating button's state, first match wins: an in-progress workout
 * beats starting today's session beats the empty-workout fallback. */
export function floatingAction(args: {
  activeWorkout: Workout | null;
  todayDay: ProgramDay | null;
  todayCompleted: boolean;
}): FloatingActionState {
  if (args.activeWorkout != null) return { kind: 'resume', workoutId: args.activeWorkout.id };
  if (args.todayDay != null && args.todayDay.kind === 'lifting' && !args.todayCompleted) {
    return { kind: 'startToday' };
  }
  return { kind: 'startEmpty' };
}

export interface DayMetrics {
  exercises: number;
  /** Prescribed working sets across the day (exercises with no prescribed
   * count contribute nothing). */
  sets: number;
}

/** The at-a-glance numbers on a week card — our equivalent of the "256 kcal ·
 * 16 mins" line on a plan row. Only lifting days have them; court/rest/comp
 * days carry their notes instead. */
export function dayMetrics(day: ProgramDay): DayMetrics | null {
  if (day.kind !== 'lifting') return null;
  return {
    exercises: day.exercises.length,
    sets: day.exercises.reduce((total, e) => total + (e.sets ?? 0), 0),
  };
}
