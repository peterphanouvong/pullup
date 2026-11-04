import { upcomingSets } from '../selectors';
import type { Workout, WorkoutExercise, WorkoutSet } from '../types';

const ts = '2026-10-28T10:00:00.000Z';

function exercise(overrides: Partial<WorkoutExercise> & Pick<WorkoutExercise, 'id' | 'exercise_name' | 'position'>): WorkoutExercise {
  return {
    user_id: 'user-1',
    workout_id: 'w1',
    exercise_id: null,
    rest_seconds: null,
    notes: null,
    created_at: ts,
    updated_at: ts,
    deleted: false,
    ...overrides,
  };
}

function set(overrides: Partial<WorkoutSet> & Pick<WorkoutSet, 'id' | 'workout_exercise_id' | 'position'>): WorkoutSet {
  return {
    user_id: 'user-1',
    set_type: 'working',
    weight_kg: null,
    reps: null,
    duration_seconds: null,
    target: null,
    completed_at: null,
    created_at: ts,
    updated_at: ts,
    deleted: false,
    ...overrides,
  };
}

const exercises = {
  e1: exercise({ id: 'e1', exercise_name: 'Back squat', position: 1 }),
  e2: exercise({ id: 'e2', exercise_name: 'Pull-up', position: 2, log_type: 'reps' }),
  gone: exercise({ id: 'gone', exercise_name: 'Deleted', position: 0, deleted: true }),
};
const sets = {
  s1: set({ id: 's1', workout_exercise_id: 'e1', position: 1, weight_kg: 80, reps: 5, completed_at: ts }),
  s2: set({ id: 's2', workout_exercise_id: 'e1', position: 2, weight_kg: 85, reps: 5 }),
  s3: set({ id: 's3', workout_exercise_id: 'e1', position: 3, target: '4 × 5 @ 85%' }),
  s4: set({ id: 's4', workout_exercise_id: 'e2', position: 1, reps: 8 }),
  s5: set({ id: 's5', workout_exercise_id: 'e2', position: 2, duration_seconds: 30 }),
  sg: set({ id: 'sg', workout_exercise_id: 'gone', position: 1 }),
};

describe('upcomingSets', () => {
  it('lists the next incomplete sets in table order, as the row draws them', () => {
    expect(upcomingSets('w1', exercises, sets, 3)).toEqual([
      {
        setId: 's2',
        exerciseName: 'Back squat',
        number: 2,
        of: 3,
        label: '85 kg × 5',
        chip: '2',
        chipTone: 'working',
        logType: 'weight_reps',
        previous: '—',
        cells: [
          { value: '85', hint: 'kg' },
          { value: '5', hint: 'reps' },
        ],
      },
      {
        setId: 's3',
        exerciseName: 'Back squat',
        number: 3,
        of: 3,
        label: '4 × 5 @ 85%',
        chip: '3',
        chipTone: 'working',
        logType: 'weight_reps',
        previous: '—',
        cells: [
          { value: null, hint: 'kg' },
          { value: null, hint: 'reps' },
        ],
      },
      {
        setId: 's4',
        exerciseName: 'Pull-up',
        number: 1,
        of: 2,
        label: '8 reps',
        chip: '1',
        chipTone: 'working',
        logType: 'reps',
        previous: '—',
        cells: [{ value: '8', hint: 'reps' }],
      },
    ]);
  });

  it('respects the limit and keeps the one-line label for timed sets', () => {
    const queue = upcomingSets('w1', exercises, sets, 10);
    expect(queue).toHaveLength(4);
    expect(queue[3]).toMatchObject({ setId: 's5', exerciseName: 'Pull-up', number: 2, of: 2, label: '30 s' });
  });

  it('numbers warm-ups as W and tints drops like the row does', () => {
    const typed = {
      w: set({ id: 'w', workout_exercise_id: 'e1', position: 0, set_type: 'warmup', weight_kg: 40, reps: 8 }),
      s2: sets.s2,
      d: set({ id: 'd', workout_exercise_id: 'e1', position: 4, set_type: 'drop' }),
    };
    const queue = upcomingSets('w1', { e1: exercises.e1 }, typed, 10);
    expect(queue.map((q) => [q.chip, q.chipTone])).toEqual([
      ['W', 'warmup'],
      ['1', 'working'],
      ['D', 'intense'],
    ]);
  });

  it("shows last session's numbers as the placeholders, like the row's ghost", () => {
    const workouts: Record<string, Workout> = {
      w1: {
        id: 'w1',
        user_id: 'user-1',
        title: 'Lower',
        started_at: ts,
        finished_at: null,
        program_day_id: null,
        created_at: ts,
        updated_at: ts,
        deleted: false,
      } as Workout,
      w0: {
        id: 'w0',
        user_id: 'user-1',
        title: 'Lower',
        started_at: '2026-10-21T10:00:00.000Z',
        finished_at: '2026-10-21T11:00:00.000Z',
        program_day_id: null,
        created_at: ts,
        updated_at: ts,
        deleted: false,
      } as Workout,
    };
    const allExercises = {
      e1: exercises.e1,
      e0: exercise({ id: 'e0', exercise_name: 'back squat', position: 1, workout_id: 'w0' }),
    };
    const allSets = {
      s2: sets.s2,
      s3: sets.s3,
      p1: set({ id: 'p1', workout_exercise_id: 'e0', position: 1, weight_kg: 77.5, reps: 5, completed_at: ts }),
      p2: set({ id: 'p2', workout_exercise_id: 'e0', position: 2, weight_kg: 80, reps: 5, completed_at: ts }),
    };
    const [first, second] = upcomingSets('w1', allExercises, allSets, 3, workouts);
    // s2 is the first table row here, so it's matched to last time's first set.
    expect(first.previous).toBe('77.5kg × 5');
    expect(first.cells).toEqual([
      { value: '85', hint: '77.5' },
      { value: '5', hint: '5' },
    ]);
    expect(second.previous).toBe('80kg × 5');
    expect(second.cells).toEqual([
      { value: null, hint: '80' },
      { value: null, hint: '5' },
    ]);
  });

  it('is empty once everything is done', () => {
    const done = Object.fromEntries(Object.entries(sets).map(([k, s]) => [k, { ...s, completed_at: ts }]));
    expect(upcomingSets('w1', exercises, done)).toEqual([]);
  });
});
