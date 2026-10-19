import { dateKey, localDayOf, plannedDayOn } from '@/features/programs/calendar';
import { stripWeekdayPrefix } from '@/features/programs/labels';
import type { ProgramWeek } from '@/features/programs/types';
import { crewWeekRange } from '@/features/crews/week';
import type { RestTimerState } from '@/features/workouts/rest-timer';
import { completedSetCount, currentExerciseName } from '@/features/workouts/selectors';
import type { Workout, WorkoutExercise, WorkoutSet } from '@/features/workouts/types';
import type { WorkoutActivityProps } from '@/widgets/workout-activity';
import type { WeekWidgetProps } from '@/widgets/week-widget';

/** What the Live Activity shows for `workout`, from the store's records. */
export function workoutActivityProps(
  workout: Workout,
  workoutExercises: Record<string, WorkoutExercise>,
  workoutSets: Record<string, WorkoutSet>,
  rest: RestTimerState | null,
): WorkoutActivityProps {
  const liveExerciseIds = new Set(
    Object.values(workoutExercises)
      .filter((we) => !we.deleted && we.workout_id === workout.id)
      .map((we) => we.id),
  );
  const sets = Object.values(workoutSets).filter((s) => !s.deleted && liveExerciseIds.has(s.workout_exercise_id));
  return {
    title: workout.title,
    exerciseName: currentExerciseName(workout.id, workoutExercises, workoutSets),
    completedSets: completedSetCount(sets),
    totalSets: sets.length,
    startedAt: new Date(workout.started_at).getTime(),
    restEndsAt: rest != null ? new Date(rest.endsAt).getTime() : null,
  };
}

export interface WeekWidgetInput {
  /** Finished, non-deleted workouts. */
  finished: Workout[];
  programName: string | null;
  weeks: ProgramWeek[];
  /** The programme's Monday anchor, or null with no programme. */
  startDate: string | null;
  /** Your weekly target: what "planned" means when there's no programme. */
  weeklyTarget?: number;
}

/** The home screen widget's content as of `now`. */
export function weekWidgetProps(now: Date, input: WeekWidgetInput): WeekWidgetProps {
  const { days } = crewWeekRange(now);
  const todayIndex = days.indexOf(dateKey(now));

  const sessionDays = input.finished.map((w) => localDayOf(w.started_at));
  const trained = days.map((d) => sessionDays.includes(d));
  const done = sessionDays.filter((d) => days.includes(d)).length;

  const plan = days.map((d) => (input.startDate ? plannedDayOn(d, input.startDate, input.weeks) : null));
  const lifting = plan.map((p) => p?.kind === 'lifting');
  const planned = input.startDate ? lifting.filter(Boolean).length : (input.weeklyTarget ?? 0);

  // The next lifting day from today on that you haven't trained on.
  const nextIndex = plan.findIndex((p, i) => i >= todayIndex && lifting[i] && !trained[i]);
  const nextPlan = nextIndex >= 0 ? plan[nextIndex] : null;

  return {
    done,
    planned,
    trained,
    todayIndex,
    nextSession: nextPlan != null ? stripWeekdayPrefix(nextPlan.dayName) : null,
    programName: input.startDate ? input.programName : null,
  };
}

/** An entry for each local day from today through the next seven, dated at
 * that day's midnight, so today's ring, "next session" and the Monday reset
 * move on their own while the app isn't running. Today's entry is dated at
 * its (past) midnight rather than now, so the same data always produces the
 * same timeline and the app only re-sends it when something changed. */
export function weekWidgetTimeline(now: Date, input: WeekWidgetInput): { date: Date; props: WeekWidgetProps }[] {
  const entries: { date: Date; props: WeekWidgetProps }[] = [];
  for (let i = 0; i <= 7; i++) {
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    entries.push({ date: midnight, props: weekWidgetProps(midnight, input) });
  }
  return entries;
}
