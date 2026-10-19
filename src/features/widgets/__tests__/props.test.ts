import type { ProgramWeek } from '@/features/programs/types';
import type { Workout, WorkoutExercise, WorkoutSet } from '@/features/workouts/types';
import { weekWidgetProps, weekWidgetTimeline, workoutActivityProps } from '../props';

const ts = '2026-10-19T00:00:00.000Z';

function workout(id: string, startedAt: Date, finished = true): Workout {
  return {
    id,
    user_id: 'u',
    title: 'Lower A',
    program_day_id: null,
    started_at: startedAt.toISOString(),
    finished_at: finished ? startedAt.toISOString() : null,
    notes: null,
    created_at: ts,
    updated_at: ts,
    deleted: false,
  };
}

// Week 1 of a programme starting Monday 19 Oct 2026: lifting Mon/Wed/Fri.
const KINDS = ['lifting', 'court', 'lifting', 'rest', 'lifting', 'comp', 'rest'] as const;
const weeks: ProgramWeek[] = [
  {
    id: 'w1',
    position: 1,
    name: 'Week 1',
    phase: 'Base',
    description: null,
    days: KINDS.map((kind, i) => ({
      id: `d${i + 1}`,
      position: i + 1,
      name: ['Mon — Lower A', 'Tue', 'Wed — Upper A', 'Thu', 'Fri — Lower B', 'Sat', 'Sun'][i],
      kind,
      notes: null,
      exercises: [],
    })),
  },
];

describe('weekWidgetProps', () => {
  const wednesday = new Date(2026, 9, 21, 12);

  it('counts sessions this week, marks trained days and finds the next session', () => {
    const props = weekWidgetProps(wednesday, {
      finished: [workout('a', new Date(2026, 9, 19, 7)), workout('old', new Date(2026, 9, 12, 7))],
      programName: '8-Week Peak',
      weeks,
      startDate: '2026-10-19',
    });
    expect(props.done).toBe(1);
    expect(props.planned).toBe(3);
    expect(props.trained).toEqual([true, false, false, false, false, false, false]);
    expect(props.todayIndex).toBe(2);
    expect(props.nextSession).toBe('Upper A');
    expect(props.programName).toBe('8-Week Peak');
  });

  it('skips a session already trained today', () => {
    const props = weekWidgetProps(wednesday, {
      finished: [workout('a', new Date(2026, 9, 21, 7))],
      programName: 'P',
      weeks,
      startDate: '2026-10-19',
    });
    expect(props.nextSession).toBe('Lower B');
  });

  it('has nothing planned without a programme', () => {
    const props = weekWidgetProps(wednesday, { finished: [], programName: 'P', weeks, startDate: null });
    expect(props.planned).toBe(0);
    expect(props.nextSession).toBeNull();
    expect(props.programName).toBeNull();
  });
});

describe('weekWidgetTimeline', () => {
  it("has an entry at today's midnight and each of the next seven", () => {
    const now = new Date(2026, 9, 21, 12);
    const entries = weekWidgetTimeline(now, { finished: [], programName: null, weeks: [], startDate: null });
    expect(entries).toHaveLength(8);
    expect(entries[0].date).toEqual(new Date(2026, 9, 21));
    expect(entries[1].date).toEqual(new Date(2026, 9, 22));
    expect(entries[1].props.todayIndex).toBe(3);
    // Monday 26th starts a new week.
    expect(entries[5].props.todayIndex).toBe(0);
  });
});

describe('workoutActivityProps', () => {
  it('counts live sets, completed sets and the rest end', () => {
    const w = workout('w', new Date(2026, 9, 21, 7), false);
    const exercises: Record<string, WorkoutExercise> = {
      e1: {
        id: 'e1', user_id: 'u', workout_id: 'w', exercise_id: null, exercise_name: 'Squat', position: 1,
        rest_seconds: 150, notes: null, created_at: ts, updated_at: ts, deleted: false,
      },
    };
    const set = (id: string, completed: boolean, deleted = false): WorkoutSet => ({
      id, user_id: 'u', workout_exercise_id: 'e1', position: 1, set_type: 'working', weight_kg: null, reps: null,
      duration_seconds: null, target: null, completed_at: completed ? ts : null, created_at: ts, updated_at: ts, deleted,
    });
    const props = workoutActivityProps(
      w,
      exercises,
      { s1: set('s1', true), s2: set('s2', false), s3: set('s3', true, true) },
      { endsAt: '2026-10-21T07:05:00.000Z' } as never,
    );
    expect(props).toMatchObject({ title: 'Lower A', exerciseName: 'Squat', completedSets: 1, totalSets: 2 });
    expect(props.restEndsAt).toBe(Date.parse('2026-10-21T07:05:00.000Z'));
  });
});
