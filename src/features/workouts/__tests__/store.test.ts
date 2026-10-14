// Smoke test for the workout store's SHAPE (not the sync protocol): Legend-State
// observables are object-keyed (Record<string, Row>), initWorkoutStore is
// idempotent, writes are readable back immediately, and soft-deleting a row
// flips `deleted` without removing the key. The Supabase client is mocked (no
// network); AsyncStorage persistence is backed by the library's own Jest
// mock (see the `moduleNameMapper` entry in package.json) — no native module
// needed in Jest.

import {
  initWorkoutStore,
  exercises$,
  workouts$,
  workoutExercises$,
  workoutSets$,
  generateId,
} from '../store';
import type { Workout, WorkoutSet } from '../types';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => {
      const builder: any = {
        select: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        then: (resolve: (value: unknown) => unknown) => resolve({ data: [], error: null }),
      };
      return builder;
    }),
  },
}));

describe('initWorkoutStore', () => {
  it('builds all four object-keyed observables', async () => {
    initWorkoutStore('user-1');

    expect(exercises$).toBeDefined();
    expect(workouts$).toBeDefined();
    expect(workoutExercises$).toBeDefined();
    expect(workoutSets$).toBeDefined();

    // Object-keyed, not array-keyed: once the (mocked, empty) initial list
    // resolves, an empty store reads as `{}` (or is still loading, i.e.
    // `undefined`), never `[]` — the sync protocol itself isn't under test
    // here, so we only assert it never becomes an array.
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(Array.isArray(workouts$.get())).toBe(false);
  });

  it('is idempotent: calling it again for the same user is a no-op', () => {
    initWorkoutStore('user-1');
    const workoutsRef = workouts$;

    initWorkoutStore('user-1');

    expect(workouts$).toBe(workoutsRef);
  });
});

describe('store shape', () => {
  beforeEach(() => {
    initWorkoutStore('user-2');
  });

  it('writes a row by id and reads it back', () => {
    const workout: Workout = {
      id: 'w1',
      user_id: 'user-2',
      title: 'Push day',
      program_day_id: null,
      started_at: '2026-10-14T10:00:00.000Z',
      finished_at: null,
      notes: null,
      created_at: '2026-10-14T10:00:00.000Z',
      updated_at: '2026-10-14T10:00:00.000Z',
      deleted: false,
    };

    workouts$['w1'].set(workout);

    expect(workouts$['w1'].get()).toEqual(workout);
    expect(Object.keys(workouts$.get())).toContain('w1');
  });

  it('soft-deletes by setting `deleted: true` without removing the key', () => {
    const set: WorkoutSet = {
      id: 's1',
      user_id: 'user-2',
      workout_exercise_id: 'we1',
      position: 0,
      set_type: 'working',
      weight_kg: 60,
      reps: 8,
      duration_seconds: null,
      target: '3x8 @60kg',
      completed_at: null,
      created_at: '2026-10-14T10:00:00.000Z',
      updated_at: '2026-10-14T10:00:00.000Z',
      deleted: false,
    };

    workoutSets$['s1'].set(set);
    workoutSets$['s1'].deleted.set(true);

    expect(Object.keys(workoutSets$.get())).toContain('s1');
    expect(workoutSets$['s1'].deleted.get()).toBe(true);
    // The rest of the row survives the soft delete.
    expect(workoutSets$['s1'].weight_kg.get()).toBe(60);
    expect(workoutSets$['s1'].reps.get()).toBe(8);
  });
});

describe('generateId', () => {
  it('is a function (expo-crypto randomUUID) usable for client-generated ids', () => {
    expect(typeof generateId).toBe('function');
  });
});
