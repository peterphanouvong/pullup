// Writer-function smoke tests for the active-workout screen's mutations.
// Supabase is mocked exactly like store.test.ts (no network); each test gets
// a fresh user id via initWorkoutStore so observables start empty.

import {
  addSet,
  completeSet,
  discardWorkout,
  finishWorkout,
  nextSetType,
  selectWorkoutView,
  softDeleteSet,
  startEmptyWorkout,
  startWorkoutFromDay,
  updateExerciseNotes,
  updateSet,
} from '../hooks';
import { initWorkoutStore, workoutExercises$, workoutSets$, workouts$ } from '../store';
import type { ProgramDay } from '@/features/programs/types';

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

// expo-crypto's `randomUUID` is a native binding that resolves to `undefined`
// under Jest (no native module) — store.ts's `generateId()` wraps it
// directly, so these writer tests (which exercise real id generation, unlike
// store.test.ts's shape-only checks) need a deterministic stand-in.
let mockUuidCounter = 0;
jest.mock('expo-crypto', () => ({
  randomUUID: () => `test-uuid-${++mockUuidCounter}`,
}));

let userCounter = 0;
function freshUser(): string {
  userCounter += 1;
  return `user-hooks-${userCounter}`;
}

/** `useWorkout` is `use$(() => selectWorkoutView(id, ...observables.get()))`
 * — a thin reactive wrapper with no logic of its own, over Task 2's already
 * store-shape-tested `use$`/`get()` primitives. These tests exercise
 * `selectWorkoutView` directly against the real store's plain `.get()`
 * snapshots, so they don't need a React render (no
 * `@testing-library/react-native` dependency, not installed in this repo). */
function readWorkoutView(id: string) {
  return selectWorkoutView(id, workouts$.get() ?? {}, workoutExercises$.get() ?? {}, workoutSets$.get() ?? {});
}

const liftingDay: ProgramDay = {
  id: 'day-1',
  position: 1,
  name: 'Mon — Lower power',
  kind: 'lifting',
  notes: null,
  exercises: [
    {
      id: 'de-1',
      position: 1,
      exerciseName: 'Front squat',
      exerciseId: 'ex-front-squat',
      sets: 3,
      reps: '5',
      load: '80%',
      notes: null,
    },
  ],
};

describe('startWorkoutFromDay', () => {
  it('writes the workout + exercises + sets into the store and returns the workout id', () => {
    const userId = freshUser();
    initWorkoutStore(userId);

    const workoutId = startWorkoutFromDay(liftingDay, 'day-1', userId);

    expect(workouts$[workoutId].get()).toBeDefined();
    expect(workouts$[workoutId].title.get()).toBe('Mon — Lower power');
    expect(workouts$[workoutId].program_day_id.get()).toBe('day-1');

    const exercises = Object.values(workoutExercises$.get() ?? {}).filter(
      (e: any) => e.workout_id === workoutId,
    );
    expect(exercises).toHaveLength(1);

    const sets = Object.values(workoutSets$.get() ?? {}).filter(
      (s: any) => s.workout_exercise_id === (exercises[0] as any).id,
    );
    expect(sets).toHaveLength(3);
  });
});

describe('startEmptyWorkout', () => {
  it('creates a bare workout with no program_day_id', () => {
    const userId = freshUser();
    initWorkoutStore(userId);

    const workoutId = startEmptyWorkout(userId);

    expect(workouts$[workoutId].program_day_id.get()).toBeNull();
    expect(workouts$[workoutId].finished_at.get()).toBeNull();
  });
});

describe('completeSet', () => {
  it('toggles completed_at: sets it, then clears it back to null', () => {
    const userId = freshUser();
    initWorkoutStore(userId);
    const workoutId = startWorkoutFromDay(liftingDay, 'day-1', userId);
    const [setId] = Object.keys(workoutSets$.get() ?? {}).filter(
      (id) => Object.values(workoutExercises$.get() ?? {}).some(
        (e: any) => e.id === (workoutSets$.get() as any)[id].workout_exercise_id && e.workout_id === workoutId,
      ),
    );

    const now = new Date('2026-10-14T12:00:00.000Z');
    completeSet(setId, now);
    expect(workoutSets$[setId].completed_at.get()).toBe(now.toISOString());

    completeSet(setId, new Date('2026-10-14T12:05:00.000Z'));
    expect(workoutSets$[setId].completed_at.get()).toBeNull();
  });
});

describe('updateSet', () => {
  it('merges the patch fields without touching the rest of the row', () => {
    const userId = freshUser();
    initWorkoutStore(userId);
    const workoutId = startWorkoutFromDay(liftingDay, 'day-1', userId);
    const setId = Object.keys(workoutSets$.get() ?? {})[0];

    updateSet(setId, { weight_kg: 100, reps: 5 });

    expect(workoutSets$[setId].weight_kg.get()).toBe(100);
    expect(workoutSets$[setId].reps.get()).toBe(5);
    expect(workoutSets$[setId].workout_exercise_id.get()).toBeDefined();
    void workoutId;
  });
});

describe('addSet', () => {
  it('appends a new set copying the last row\'s values, at position max+1', () => {
    const userId = freshUser();
    initWorkoutStore(userId);
    startWorkoutFromDay(liftingDay, 'day-1', userId);
    const exerciseId = Object.keys(workoutExercises$.get() ?? {})[0];
    const beforeIds = Object.keys(workoutSets$.get() ?? {});

    updateSet(beforeIds[beforeIds.length - 1], { weight_kg: 120, reps: 3 });
    addSet(exerciseId);

    const afterSets = Object.values(workoutSets$.get() ?? {}).filter(
      (s: any) => s.workout_exercise_id === exerciseId,
    ) as any[];
    expect(afterSets).toHaveLength(4);
    const newSet = afterSets.reduce((a, b) => (a.position > b.position ? a : b));
    expect(newSet.position).toBe(4);
    expect(newSet.weight_kg).toBe(120);
    expect(newSet.reps).toBe(3);
  });
});

describe('softDeleteSet', () => {
  it('flips deleted without removing the key', () => {
    const userId = freshUser();
    initWorkoutStore(userId);
    startWorkoutFromDay(liftingDay, 'day-1', userId);
    const setId = Object.keys(workoutSets$.get() ?? {})[0];

    softDeleteSet(setId);

    expect(workoutSets$[setId].deleted.get()).toBe(true);
    expect(Object.keys(workoutSets$.get() ?? {})).toContain(setId);
  });
});

describe('updateExerciseNotes / finishWorkout', () => {
  it('writes exercise notes and stamps finished_at', () => {
    const userId = freshUser();
    initWorkoutStore(userId);
    const workoutId = startWorkoutFromDay(liftingDay, 'day-1', userId);
    const exerciseId = Object.keys(workoutExercises$.get() ?? {})[0];

    updateExerciseNotes(exerciseId, 'felt heavy');
    expect(workoutExercises$[exerciseId].notes.get()).toBe('felt heavy');

    const now = new Date('2026-10-14T13:00:00.000Z');
    finishWorkout(workoutId, now);
    expect(workouts$[workoutId].finished_at.get()).toBe(now.toISOString());
  });
});

describe('discardWorkout', () => {
  it('soft-deletes the workout and every live exercise/set under it', () => {
    const userId = freshUser();
    initWorkoutStore(userId);
    const workoutId = startWorkoutFromDay(liftingDay, 'day-1', userId);
    const exerciseId = Object.keys(workoutExercises$.get() ?? {})[0];
    const setIds = Object.keys(workoutSets$.get() ?? {});

    discardWorkout(workoutId);

    expect(workouts$[workoutId].deleted.get()).toBe(true);
    expect(workoutExercises$[exerciseId].deleted.get()).toBe(true);
    for (const setId of setIds) {
      expect(workoutSets$[setId].deleted.get()).toBe(true);
    }
  });

  it('cascades sets under an exercise that was already soft-deleted before the workout was discarded', () => {
    // Regression for fix-round-1 finding 5: sub-project C's mid-workout
    // exercise editor can soft-delete a `workout_exercise` while the workout
    // is still active, but leave its `workout_sets` rows live (the editor's
    // own concern, not discardWorkout's). Scoping the sets cascade to only
    // *currently-live* exercises would skip that exercise's still-live sets.
    const userId = freshUser();
    initWorkoutStore(userId);
    const workoutId = startWorkoutFromDay(liftingDay, 'day-1', userId);
    const nowIso = new Date().toISOString();

    const preDeletedExerciseId = 'we-pre-deleted';
    workoutExercises$[preDeletedExerciseId].set({
      id: preDeletedExerciseId,
      user_id: userId,
      workout_id: workoutId,
      exercise_id: null,
      exercise_name: 'Removed mid-workout',
      position: 99,
      rest_seconds: null,
      notes: null,
      created_at: nowIso,
      updated_at: nowIso,
      deleted: true, // already soft-deleted before discardWorkout runs
    });

    const orphanSetId = 'set-under-pre-deleted-exercise';
    workoutSets$[orphanSetId].set({
      id: orphanSetId,
      user_id: userId,
      workout_exercise_id: preDeletedExerciseId,
      position: 1,
      set_type: 'working',
      weight_kg: null,
      reps: null,
      duration_seconds: null,
      target: null,
      completed_at: null,
      created_at: nowIso,
      updated_at: nowIso,
      deleted: false, // still live — this is the set that must get cascaded
    });

    discardWorkout(workoutId);

    expect(workoutSets$[orphanSetId].deleted.get()).toBe(true);
  });
});

describe('nextSetType', () => {
  it('cycles warmup -> working -> drop -> failure -> warmup', () => {
    expect(nextSetType('warmup')).toBe('working');
    expect(nextSetType('working')).toBe('drop');
    expect(nextSetType('drop')).toBe('failure');
    expect(nextSetType('failure')).toBe('warmup');
  });
});

describe('selectWorkoutView (useWorkout\'s projection)', () => {
  it('reads the workout and its live exercises/sets sorted by position, excluding deleted rows', () => {
    const userId = freshUser();
    initWorkoutStore(userId);
    const workoutId = startWorkoutFromDay(liftingDay, 'day-1', userId);
    const exerciseId = Object.keys(workoutExercises$.get() ?? {})[0];
    const setIds = Object.keys(workoutSets$.get() ?? {});
    softDeleteSet(setIds[0]);

    const result = readWorkoutView(workoutId);

    expect(result.workout?.id).toBe(workoutId);
    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0].id).toBe(exerciseId);
    expect(result.exercises[0].sets).toHaveLength(2);
  });

  it('returns a null workout for an unknown id', () => {
    const userId = freshUser();
    initWorkoutStore(userId);

    const result = readWorkoutView('does-not-exist');

    expect(result.workout).toBeNull();
    expect(result.exercises).toEqual([]);
  });
});
