// Pure mid-workout editing logic: moveExercise (position swaps over the
// already-sorted, already-deleted-filtered visible list), buildAddedExercise
// (Add Exercise payload — one empty working set), and buildReplacement
// (Replace exercise — identity fields only, sets/notes/rest survive
// untouched because the caller never overwrites them with this result).
// No store imports — fixtures are built by hand, same style as
// selectors.test.ts/start.test.ts.

import { moveExercise, buildAddedExercise, buildReplacement, fillDownTargets } from '../edit';
import type { Exercise, WorkoutExercise, WorkoutSet } from '../types';

const ts = '2026-10-14T10:00:00.000Z';

function exercise(overrides: Partial<WorkoutExercise> & Pick<WorkoutExercise, 'id' | 'position'>): WorkoutExercise {
  return {
    user_id: 'user-1',
    workout_id: 'w1',
    exercise_id: null,
    exercise_name: 'Power clean',
    rest_seconds: 150,
    notes: null,
    created_at: ts,
    updated_at: ts,
    deleted: false,
    ...overrides,
  };
}

function libraryExercise(overrides: Partial<Exercise> & Pick<Exercise, 'id'>): Exercise {
  return {
    name: 'Back squat',
    muscle_group: 'Legs',
    equipment: 'Barbell',
    owner_id: null,
    created_at: ts,
    updated_at: ts,
    deleted: false,
    ...overrides,
  };
}

describe('moveExercise', () => {
  it('swaps positions between adjacent visible rows (contiguous positions)', () => {
    const list = [exercise({ id: 'a', position: 1 }), exercise({ id: 'b', position: 2 }), exercise({ id: 'c', position: 3 })];

    const result = moveExercise(list, 'b', 'up');

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        { id: 'b', position: 1 },
        { id: 'a', position: 2 },
      ]),
    );
  });

  it('swaps positions between visible rows whose position numbers are NOT contiguous (deleted rows hold 2-3)', () => {
    // Visible list is already sorted + deleted-filtered by the caller: row
    // "a" sits at position 1, row "d" at position 4 — the gap (2, 3) is held
    // by soft-deleted rows the caller already excluded. moveExercise must
    // swap on the VISIBLE adjacency (a <-> d), not on numeric adjacency.
    const list = [exercise({ id: 'a', position: 1 }), exercise({ id: 'd', position: 4 })];

    const down = moveExercise(list, 'a', 'down');
    expect(down).toEqual(
      expect.arrayContaining([
        { id: 'a', position: 4 },
        { id: 'd', position: 1 },
      ]),
    );
    expect(down).toHaveLength(2);

    const up = moveExercise(list, 'd', 'up');
    expect(up).toEqual(
      expect.arrayContaining([
        { id: 'd', position: 1 },
        { id: 'a', position: 4 },
      ]),
    );
    expect(up).toHaveLength(2);
  });

  it('returns [] moving the first row up (at the start end)', () => {
    const list = [exercise({ id: 'a', position: 1 }), exercise({ id: 'b', position: 2 })];
    expect(moveExercise(list, 'a', 'up')).toEqual([]);
  });

  it('returns [] moving the last row down (at the end)', () => {
    const list = [exercise({ id: 'a', position: 1 }), exercise({ id: 'b', position: 2 })];
    expect(moveExercise(list, 'b', 'down')).toEqual([]);
  });

  it('returns [] for an unknown id', () => {
    const list = [exercise({ id: 'a', position: 1 }), exercise({ id: 'b', position: 2 })];
    expect(moveExercise(list, 'missing', 'up')).toEqual([]);
  });

  it('returns [] for a single-row list in either direction', () => {
    const list = [exercise({ id: 'a', position: 1 })];
    expect(moveExercise(list, 'a', 'up')).toEqual([]);
    expect(moveExercise(list, 'a', 'down')).toEqual([]);
  });
});

describe('buildAddedExercise', () => {
  it('shapes the workout_exercise and its one empty working set, field by field', () => {
    const now = new Date(ts);
    const ex = libraryExercise({ id: 'ex-1', name: 'Deadlift', muscle_group: 'Back', equipment: 'Barbell' });
    let calls = 0;
    const idGen = () => `gen-${++calls}`;

    const result = buildAddedExercise({
      workoutId: 'w1',
      userId: 'user-1',
      exercise: ex,
      position: 4,
      now,
      idGen,
    });

    expect(result.exercise).toEqual({
      id: 'gen-1',
      user_id: 'user-1',
      workout_id: 'w1',
      exercise_id: 'ex-1',
      exercise_name: 'Deadlift',
      position: 4,
      rest_seconds: 150,
      notes: null,
      created_at: ts,
      updated_at: ts,
      deleted: false,
    });

    expect(result.set).toEqual({
      id: 'gen-2',
      user_id: 'user-1',
      workout_exercise_id: 'gen-1',
      position: 1,
      set_type: 'working',
      weight_kg: null,
      reps: null,
      duration_seconds: null,
      target: null,
      completed_at: null,
      created_at: ts,
      updated_at: ts,
      deleted: false,
    });
  });

  it('defaults idGen so a caller can omit it (distinct ids, not store-dependent)', () => {
    const ex = libraryExercise({ id: 'ex-2', name: 'Row' });
    const result = buildAddedExercise({
      workoutId: 'w1',
      userId: 'user-1',
      exercise: ex,
      position: 1,
      now: new Date(ts),
    });
    expect(typeof result.exercise.id).toBe('string');
    expect(result.exercise.id.length).toBeGreaterThan(0);
    expect(result.set.workout_exercise_id).toBe(result.exercise.id);
    expect(result.set.id).not.toBe(result.exercise.id);
  });
});

describe('buildReplacement', () => {
  it('returns only exercise_id + exercise_name — nothing else', () => {
    const ex = libraryExercise({ id: 'ex-9', name: 'Incline bench' });
    const result = buildReplacement(ex);
    expect(result).toEqual({ exercise_id: 'ex-9', exercise_name: 'Incline bench' });
    expect(Object.keys(result).sort()).toEqual(['exercise_id', 'exercise_name']);
  });
});

describe('fillDownTargets', () => {
  function s(id: string, position: number, deleted = false): WorkoutSet {
    return {
      id,
      user_id: 'u',
      workout_exercise_id: 'we1',
      position,
      set_type: 'working',
      weight_kg: null,
      reps: null,
      duration_seconds: null,
      target: null,
      completed_at: null,
      created_at: '2026-10-14T10:00:00.000Z',
      updated_at: '2026-10-14T10:00:00.000Z',
      deleted,
    };
  }

  it('returns the live sets below the source, in position order', () => {
    const sets = [s('c', 3), s('a', 1), s('b', 2)];
    expect(fillDownTargets(sets, 'a')).toEqual(['b', 'c']);
  });

  it('skips deleted sets', () => {
    const sets = [s('a', 1), s('gone', 2, true), s('c', 3)];
    expect(fillDownTargets(sets, 'a')).toEqual(['c']);
  });

  it('returns nothing for the last set or an unknown id', () => {
    const sets = [s('a', 1), s('b', 2)];
    expect(fillDownTargets(sets, 'b')).toEqual([]);
    expect(fillDownTargets(sets, 'nope')).toEqual([]);
  });
});
