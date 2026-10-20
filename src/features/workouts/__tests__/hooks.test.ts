// Writer-function smoke tests for the active-workout screen's mutations.
// Supabase is mocked exactly like store.test.ts (no network); each test gets
// a fresh user id via initWorkoutStore so observables start empty.

import {
  addExerciseToWorkout,
  addSet,
  completeSet,
  discardWorkout,
  finishWorkout,
  moveExerciseInWorkout,
  nextSetType,
  removeExercise,
  replaceExercise,
  saveWorkout,
  selectWorkoutView,
  softDeleteSet,
  startEmptyWorkout,
  startWorkoutFromDay,
  updateExerciseNotes,
  updateSet,
} from '../hooks';
import { restTimer$, startRestTimer } from '../rest-timer';
import { initWorkoutStore, workoutExercises$, workoutSets$, workouts$ } from '../store';
import type { Exercise, WorkoutExercise, WorkoutSet } from '../types';
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

/** `useWorkout` is `useSelector(() => selectWorkoutView(id, ...observables.get()))`
 * — a thin reactive wrapper with no logic of its own, over Task 2's already
 * store-shape-tested `useSelector`/`get()` primitives. These tests exercise
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

  it('finishWorkout clears any running rest timer (fix-round-2 finding 4: a stale timer must not survive finish)', () => {
    const userId = freshUser();
    initWorkoutStore(userId);
    const workoutId = startWorkoutFromDay(liftingDay, 'day-1', userId);
    startRestTimer(90, new Date('2026-10-14T13:00:00.000Z'));
    expect(restTimer$.get()).not.toBeNull();

    finishWorkout(workoutId, new Date('2026-10-14T13:05:00.000Z'));

    expect(restTimer$.get()).toBeNull();
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

  it('clears any running rest timer (fix-round-2 finding 4: a stale timer must not survive discard)', () => {
    const userId = freshUser();
    initWorkoutStore(userId);
    const workoutId = startWorkoutFromDay(liftingDay, 'day-1', userId);
    startRestTimer(60, new Date('2026-10-14T12:00:00.000Z'));
    expect(restTimer$.get()).not.toBeNull();

    discardWorkout(workoutId);

    expect(restTimer$.get()).toBeNull();
  });
});

function libraryExercise(overrides: Partial<Exercise> & Pick<Exercise, 'id' | 'name'>): Exercise {
  const nowIso = new Date('2026-10-14T09:00:00.000Z').toISOString();
  return {
    muscle_group: 'Back',
    equipment: 'Cable',
    owner_id: null,
    created_at: nowIso,
    updated_at: nowIso,
    deleted: false,
    ...overrides,
  };
}

describe('addExerciseToWorkout', () => {
  it('appends at position = max over ALL exercises (incl. deleted) + 1, with one empty set', () => {
    const userId = freshUser();
    initWorkoutStore(userId);
    const workoutId = startWorkoutFromDay(liftingDay, 'day-1', userId); // one live exercise at position 1

    // A soft-deleted exercise sitting at a higher position than anything
    // live — addExerciseToWorkout must still jump past it (position 6), not
    // reuse the gap it left behind.
    const nowIso = new Date().toISOString();
    const deletedExercise: WorkoutExercise = {
      id: 'we-deleted-gap',
      user_id: userId,
      workout_id: workoutId,
      exercise_id: null,
      exercise_name: 'Removed earlier',
      position: 5,
      rest_seconds: null,
      notes: null,
      created_at: nowIso,
      updated_at: nowIso,
      deleted: true,
    };
    workoutExercises$[deletedExercise.id].set(deletedExercise);

    const pick = libraryExercise({ id: 'ex-lat-pulldown', name: 'Lat pulldown' });
    addExerciseToWorkout(workoutId, userId, pick);

    const added = Object.values(workoutExercises$.get() ?? {}).find(
      (e): e is WorkoutExercise => !!e && e.exercise_id === 'ex-lat-pulldown',
    );
    expect(added).toBeDefined();
    expect(added?.position).toBe(6);
    expect(added?.exercise_name).toBe('Lat pulldown');
    expect(added?.deleted).toBe(false);

    const sets = Object.values(workoutSets$.get() ?? {}).filter(
      (s): s is WorkoutSet => !!s && s.workout_exercise_id === added?.id,
    );
    expect(sets).toHaveLength(1);
    expect(sets[0].completed_at).toBeNull();
  });
});

describe('replaceExercise', () => {
  it('swaps exercise_id/exercise_name only — sets and notes survive untouched', () => {
    const userId = freshUser();
    initWorkoutStore(userId);
    const workoutId = startWorkoutFromDay(liftingDay, 'day-1', userId);
    const exerciseId = Object.keys(workoutExercises$.get() ?? {})[0];
    updateExerciseNotes(exerciseId, 'knees hurt today');
    const setIdsBefore = Object.values(workoutSets$.get() ?? {})
      .filter((s): s is WorkoutSet => !!s && s.workout_exercise_id === exerciseId)
      .map((s) => s.id)
      .sort();

    const pick = libraryExercise({ id: 'ex-leg-press', name: 'Leg press', muscle_group: 'Legs', equipment: 'Machine' });
    replaceExercise(exerciseId, pick);

    expect(workoutExercises$[exerciseId].exercise_id.get()).toBe('ex-leg-press');
    expect(workoutExercises$[exerciseId].exercise_name.get()).toBe('Leg press');
    expect(workoutExercises$[exerciseId].notes.get()).toBe('knees hurt today');

    const setIdsAfter = Object.values(workoutSets$.get() ?? {})
      .filter((s): s is WorkoutSet => !!s && s.workout_exercise_id === exerciseId)
      .map((s) => s.id)
      .sort();
    expect(setIdsAfter).toEqual(setIdsBefore);
    void workoutId;
  });
});

describe('removeExercise', () => {
  it('soft-deletes the exercise row and cascades to every live set under it', () => {
    const userId = freshUser();
    initWorkoutStore(userId);
    const workoutId = startWorkoutFromDay(liftingDay, 'day-1', userId);
    const exerciseId = Object.keys(workoutExercises$.get() ?? {})[0];
    const setIds = Object.keys(workoutSets$.get() ?? {});

    removeExercise(exerciseId);

    expect(workoutExercises$[exerciseId].deleted.get()).toBe(true);
    for (const setId of setIds) {
      expect(workoutSets$[setId].deleted.get()).toBe(true);
    }
    void workoutId;
  });
});

describe('moveExerciseInWorkout', () => {
  const twoExerciseDay: ProgramDay = {
    id: 'day-2',
    position: 1,
    name: 'Tue — Pull',
    kind: 'lifting',
    notes: null,
    exercises: [
      {
        id: 'de-1',
        position: 1,
        exerciseName: 'Lat pulldown',
        exerciseId: 'ex-lat-pulldown',
        sets: 3,
        reps: '10',
        load: '60%',
        notes: null,
      },
      {
        id: 'de-2',
        position: 2,
        exerciseName: 'Seated row',
        exerciseId: 'ex-seated-row',
        sets: 3,
        reps: '10',
        load: '60%',
        notes: null,
      },
    ],
  };

  it('swaps positions with the neighbor and no-ops at the ends', () => {
    const userId = freshUser();
    initWorkoutStore(userId);
    const workoutId = startWorkoutFromDay(twoExerciseDay, 'day-2', userId);
    const [first, second] = Object.values(workoutExercises$.get() ?? {})
      .filter((e): e is WorkoutExercise => !!e && e.workout_id === workoutId)
      .sort((a, b) => a.position - b.position);
    // Snapshot the original positions as plain numbers up front — `first`/
    // `second` are live Legend-State nodes, so reading `.position` off them
    // *after* a mutation below would reflect the post-mutation value, not
    // the original one.
    const firstPosition = first.position;
    const secondPosition = second.position;

    // Already at the top — no-op.
    moveExerciseInWorkout(workoutId, first.id, 'up');
    expect(workoutExercises$[first.id].position.get()).toBe(firstPosition);
    expect(workoutExercises$[second.id].position.get()).toBe(secondPosition);

    // Swap first/second.
    moveExerciseInWorkout(workoutId, first.id, 'down');
    expect(workoutExercises$[first.id].position.get()).toBe(secondPosition);
    expect(workoutExercises$[second.id].position.get()).toBe(firstPosition);

    // `first.id` is now at the bottom — no-op.
    moveExerciseInWorkout(workoutId, first.id, 'down');
    expect(workoutExercises$[first.id].position.get()).toBe(secondPosition);
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

describe('saveWorkout', () => {
  it('writes the edited details and finishes, keeping the duration when the start moves', () => {
    const userId = freshUser();
    initWorkoutStore(userId);
    const workoutId = startWorkoutFromDay(liftingDay, 'day-1', userId);
    const originalTitle = workouts$[workoutId].title.get();
    workouts$[workoutId].started_at.set('2026-10-15T08:00:00.000Z');

    const now = new Date('2026-10-15T09:00:00.000Z');
    const movedStart = new Date('2026-10-14T08:00:00.000Z');
    saveWorkout(workoutId, { title: '  ', notes: ' felt strong ', startedAt: movedStart }, now);

    const saved = workouts$[workoutId].get()!;
    expect(saved.title).toBe(originalTitle);
    expect(saved.notes).toBe('felt strong');
    expect(saved.started_at).toBe(movedStart.toISOString());
    expect(saved.finished_at).toBe('2026-10-14T09:00:00.000Z');
    expect(saved.updated_at).toBe(now.toISOString());
  });

  it('clears a blank description', () => {
    const userId = freshUser();
    initWorkoutStore(userId);
    const workoutId = startWorkoutFromDay(liftingDay, 'day-1', userId);
    const started = new Date(workouts$[workoutId].started_at.get()!);
    saveWorkout(workoutId, { title: 'Pull day', notes: '', startedAt: started }, new Date());
    expect(workouts$[workoutId].title.get()).toBe('Pull day');
    expect(workouts$[workoutId].notes.get()).toBeNull();
  });
});
