// Pure selectors over the workout row shapes: volume, completed-set count,
// elapsed duration, previous-set ghosting, per-workout summary and the
// finished-workouts feed. No store imports — every fixture below is built
// by hand (object-keyed records, matching how Legend-State's syncedSupabase
// observables shape the data), with deliberately-included deleted rows to
// prove every selector ignores them.

import {
  workoutVolumeKg,
  completedSetCount,
  elapsedSeconds,
  previousSet,
  workoutSummary,
  finishedWorkoutsNewestFirst,
  activeWorkout,
  hasFinishedWorkoutForDay,
  finishedWorkoutSummaries,
  formatWorkoutDuration,
  activityDateLabel,
  activityMetaLabel,
  searchExercises,
  recentExerciseIds,
  currentExerciseName,
  savedTimes,
} from '../selectors';
import type { Exercise, Workout, WorkoutExercise, WorkoutSet } from '../types';

const ts = '2026-10-14T10:00:00.000Z';

function set(overrides: Partial<WorkoutSet> & Pick<WorkoutSet, 'id' | 'workout_exercise_id'>): WorkoutSet {
  return {
    user_id: 'user-1',
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
    ...overrides,
  };
}

function workout(overrides: Partial<Workout> & Pick<Workout, 'id'>): Workout {
  return {
    user_id: 'user-1',
    title: 'Workout',
    program_day_id: null,
    started_at: ts,
    finished_at: null,
    notes: null,
    created_at: ts,
    updated_at: ts,
    deleted: false,
    ...overrides,
  };
}

function libraryExercise(overrides: Partial<Exercise> & Pick<Exercise, 'id' | 'name'>): Exercise {
  return {
    muscle_group: 'Legs',
    equipment: 'Barbell',
    owner_id: null,
    created_at: ts,
    updated_at: ts,
    deleted: false,
    ...overrides,
  };
}

function exercise(
  overrides: Partial<WorkoutExercise> & Pick<WorkoutExercise, 'id' | 'workout_id'>,
): WorkoutExercise {
  return {
    user_id: 'user-1',
    exercise_id: null,
    exercise_name: 'Power clean',
    position: 1,
    rest_seconds: 150,
    notes: null,
    created_at: ts,
    updated_at: ts,
    deleted: false,
    ...overrides,
  };
}

describe('workoutVolumeKg', () => {
  it('sums weight_kg x reps over completed, non-deleted sets', () => {
    const sets: WorkoutSet[] = [
      set({ id: 's1', workout_exercise_id: 'we1', weight_kg: 100, reps: 2, completed_at: ts }),
      set({ id: 's2', workout_exercise_id: 'we1', weight_kg: 80, reps: 3, completed_at: ts }),
    ];
    expect(workoutVolumeKg(sets)).toBe(100 * 2 + 80 * 3);
  });

  it('excludes uncompleted sets', () => {
    const sets: WorkoutSet[] = [
      set({ id: 's1', workout_exercise_id: 'we1', weight_kg: 100, reps: 2, completed_at: null }),
    ];
    expect(workoutVolumeKg(sets)).toBe(0);
  });

  it('excludes deleted sets even if completed', () => {
    const sets: WorkoutSet[] = [
      set({ id: 's1', workout_exercise_id: 'we1', weight_kg: 100, reps: 2, completed_at: ts, deleted: true }),
    ];
    expect(workoutVolumeKg(sets)).toBe(0);
  });

  it('treats a duration-only (timed) completed set as 0 volume, not NaN', () => {
    const sets: WorkoutSet[] = [
      set({ id: 's1', workout_exercise_id: 'we1', duration_seconds: 40, completed_at: ts }),
    ];
    expect(workoutVolumeKg(sets)).toBe(0);
  });
});

describe('completedSetCount', () => {
  it('counts completed, non-deleted sets only', () => {
    const sets: WorkoutSet[] = [
      set({ id: 's1', workout_exercise_id: 'we1', completed_at: ts }),
      set({ id: 's2', workout_exercise_id: 'we1', completed_at: null }),
      set({ id: 's3', workout_exercise_id: 'we1', completed_at: ts, deleted: true }),
    ];
    expect(completedSetCount(sets)).toBe(1);
  });
});

describe('elapsedSeconds', () => {
  it('uses now - started_at while the workout is active (finished_at null)', () => {
    const w = workout({ id: 'w1', started_at: '2026-10-14T10:00:00.000Z' });
    const now = new Date('2026-10-14T10:05:30.000Z');
    expect(elapsedSeconds(w, now)).toBe(330);
  });

  it('uses finished_at - started_at once finished, ignoring now', () => {
    const w = workout({
      id: 'w1',
      started_at: '2026-10-14T10:00:00.000Z',
      finished_at: '2026-10-14T10:45:00.000Z',
    });
    const now = new Date('2026-10-20T00:00:00.000Z'); // long after — must be ignored
    expect(elapsedSeconds(w, now)).toBe(45 * 60);
  });
});

describe('previousSet', () => {
  const EXERCISE_ID = 'ex-power-clean';

  it('finds the same-position set from the most recent finished workout containing that exercise', () => {
    const workouts: Record<string, Workout> = {
      older: workout({ id: 'older', finished_at: '2026-10-07T11:00:00.000Z' }),
      newer: workout({ id: 'newer', finished_at: '2026-10-14T11:00:00.000Z' }),
      current: workout({ id: 'current', finished_at: null }),
    };
    const workoutExercises: Record<string, WorkoutExercise> = {
      we_older: exercise({ id: 'we_older', workout_id: 'older', exercise_id: EXERCISE_ID }),
      we_newer: exercise({ id: 'we_newer', workout_id: 'newer', exercise_id: EXERCISE_ID }),
    };
    const sets: Record<string, WorkoutSet> = {
      s_older_pos2: set({ id: 's_older_pos2', workout_exercise_id: 'we_older', position: 2, weight_kg: 90, reps: 2, completed_at: '2026-10-07T11:10:00.000Z' }),
      s_newer_pos2: set({ id: 's_newer_pos2', workout_exercise_id: 'we_newer', position: 2, weight_kg: 95, reps: 2, completed_at: '2026-10-14T11:10:00.000Z' }),
    };

    const result = previousSet({
      exerciseId: EXERCISE_ID,
      position: 2,
      currentWorkoutId: 'current',
      workouts,
      workoutExercises,
      sets,
    });

    expect(result?.id).toBe('s_newer_pos2');
    expect(result?.weight_kg).toBe(95);
  });

  it('excludes the current workout even if it is the most recently finished', () => {
    const workouts: Record<string, Workout> = {
      current: workout({ id: 'current', finished_at: '2026-10-20T11:00:00.000Z' }),
      previous: workout({ id: 'previous', finished_at: '2026-10-14T11:00:00.000Z' }),
    };
    const workoutExercises: Record<string, WorkoutExercise> = {
      we_current: exercise({ id: 'we_current', workout_id: 'current', exercise_id: EXERCISE_ID }),
      we_previous: exercise({ id: 'we_previous', workout_id: 'previous', exercise_id: EXERCISE_ID }),
    };
    const sets: Record<string, WorkoutSet> = {
      s_current: set({ id: 's_current', workout_exercise_id: 'we_current', position: 1, weight_kg: 999, completed_at: '2026-10-20T11:10:00.000Z' }),
      s_previous: set({ id: 's_previous', workout_exercise_id: 'we_previous', position: 1, weight_kg: 90, completed_at: '2026-10-14T11:10:00.000Z' }),
    };

    const result = previousSet({
      exerciseId: EXERCISE_ID,
      position: 1,
      currentWorkoutId: 'current',
      workouts,
      workoutExercises,
      sets,
    });

    expect(result?.id).toBe('s_previous');
  });

  it('ignores unfinished workouts entirely', () => {
    const workouts: Record<string, Workout> = {
      active: workout({ id: 'active', finished_at: null }),
    };
    const workoutExercises: Record<string, WorkoutExercise> = {
      we_active: exercise({ id: 'we_active', workout_id: 'active', exercise_id: EXERCISE_ID }),
    };
    const sets: Record<string, WorkoutSet> = {
      s_active: set({ id: 's_active', workout_exercise_id: 'we_active', position: 1, weight_kg: 90, completed_at: ts }),
    };

    expect(
      previousSet({ exerciseId: EXERCISE_ID, position: 1, currentWorkoutId: 'current', workouts, workoutExercises, sets }),
    ).toBeNull();
  });

  it('ignores deleted workouts, deleted workout_exercises, and deleted sets', () => {
    const workouts: Record<string, Workout> = {
      deletedWorkout: workout({ id: 'deletedWorkout', finished_at: '2026-10-19T00:00:00.000Z', deleted: true }),
      deletedExerciseWorkout: workout({ id: 'deletedExerciseWorkout', finished_at: '2026-10-18T00:00:00.000Z' }),
      deletedSetWorkout: workout({ id: 'deletedSetWorkout', finished_at: '2026-10-17T00:00:00.000Z' }),
      good: workout({ id: 'good', finished_at: '2026-10-16T00:00:00.000Z' }),
    };
    const workoutExercises: Record<string, WorkoutExercise> = {
      we1: exercise({ id: 'we1', workout_id: 'deletedWorkout', exercise_id: EXERCISE_ID }),
      we2: exercise({ id: 'we2', workout_id: 'deletedExerciseWorkout', exercise_id: EXERCISE_ID, deleted: true }),
      we3: exercise({ id: 'we3', workout_id: 'deletedSetWorkout', exercise_id: EXERCISE_ID }),
      we4: exercise({ id: 'we4', workout_id: 'good', exercise_id: EXERCISE_ID }),
    };
    const sets: Record<string, WorkoutSet> = {
      s1: set({ id: 's1', workout_exercise_id: 'we1', position: 1, weight_kg: 1, completed_at: ts }),
      s2: set({ id: 's2', workout_exercise_id: 'we2', position: 1, weight_kg: 2, completed_at: ts }),
      s3: set({ id: 's3', workout_exercise_id: 'we3', position: 1, weight_kg: 3, completed_at: ts, deleted: true }),
      s4: set({ id: 's4', workout_exercise_id: 'we4', position: 1, weight_kg: 4, completed_at: ts }),
    };

    const result = previousSet({
      exerciseId: EXERCISE_ID,
      position: 1,
      currentWorkoutId: 'current',
      workouts,
      workoutExercises,
      sets,
    });

    expect(result?.id).toBe('s4');
  });

  it('returns null when no finished workout contains the exercise', () => {
    expect(
      previousSet({
        exerciseId: 'nonexistent',
        position: 1,
        currentWorkoutId: 'current',
        workouts: {},
        workoutExercises: {},
        sets: {},
      }),
    ).toBeNull();
  });

  it('returns null when no qualifying workout has a set at that position (nothing earlier to fall back to)', () => {
    const workouts: Record<string, Workout> = {
      only: workout({ id: 'only', finished_at: ts }),
    };
    const workoutExercises: Record<string, WorkoutExercise> = {
      we1: exercise({ id: 'we1', workout_id: 'only', exercise_id: EXERCISE_ID }),
    };
    const sets: Record<string, WorkoutSet> = {
      s1: set({ id: 's1', workout_exercise_id: 'we1', position: 1, weight_kg: 1, completed_at: ts }),
    };

    // Requesting position 3, which this (only, most recent) matching workout never logged.
    expect(
      previousSet({ exerciseId: EXERCISE_ID, position: 3, currentWorkoutId: 'current', workouts, workoutExercises, sets }),
    ).toBeNull();
  });

  it('falls back to an earlier workout when the most recent one logged the exercise but not at that position', () => {
    const workouts: Record<string, Workout> = {
      newer: workout({ id: 'newer', finished_at: '2026-10-14T00:00:00.000Z' }),
      older: workout({ id: 'older', finished_at: '2026-10-07T00:00:00.000Z' }),
    };
    const workoutExercises: Record<string, WorkoutExercise> = {
      we_newer: exercise({ id: 'we_newer', workout_id: 'newer', exercise_id: EXERCISE_ID }),
      we_older: exercise({ id: 'we_older', workout_id: 'older', exercise_id: EXERCISE_ID }),
    };
    const sets: Record<string, WorkoutSet> = {
      // "newer" only logged 2 sets; "older" logged a 3rd.
      s_newer_1: set({ id: 's_newer_1', workout_exercise_id: 'we_newer', position: 1, weight_kg: 10, completed_at: ts }),
      s_newer_2: set({ id: 's_newer_2', workout_exercise_id: 'we_newer', position: 2, weight_kg: 10, completed_at: ts }),
      s_older_3: set({ id: 's_older_3', workout_exercise_id: 'we_older', position: 3, weight_kg: 9, completed_at: ts }),
    };

    const result = previousSet({
      exerciseId: EXERCISE_ID,
      position: 3,
      currentWorkoutId: 'current',
      workouts,
      workoutExercises,
      sets,
    });

    expect(result?.id).toBe('s_older_3');
  });
});

describe('workoutSummary', () => {
  it('derives duration, volume, completed count and per-exercise best completed set', () => {
    const w = workout({
      id: 'w1',
      started_at: '2026-10-14T10:00:00.000Z',
      finished_at: '2026-10-14T10:50:00.000Z',
    });
    const exercises: WorkoutExercise[] = [
      exercise({ id: 'we1', workout_id: 'w1', exercise_name: 'Power clean', position: 1 }),
      exercise({ id: 'we2', workout_id: 'w1', exercise_name: 'Front squat', position: 2 }),
    ];
    const sets: WorkoutSet[] = [
      set({ id: 's1', workout_exercise_id: 'we1', position: 1, weight_kg: 80, reps: 2, completed_at: '2026-10-14T10:10:00.000Z' }),
      set({ id: 's2', workout_exercise_id: 'we1', position: 2, weight_kg: 85, reps: 2, completed_at: '2026-10-14T10:12:00.000Z' }),
      set({ id: 's3', workout_exercise_id: 'we1', position: 3, weight_kg: 85, reps: 1, completed_at: null }), // not completed
      set({ id: 's4', workout_exercise_id: 'we2', position: 1, weight_kg: 120, reps: 3, completed_at: '2026-10-14T10:30:00.000Z' }),
    ];

    const summary = workoutSummary(w, exercises, sets);

    expect(summary.durationSeconds).toBe(50 * 60);
    expect(summary.volumeKg).toBe(80 * 2 + 85 * 2 + 120 * 3);
    expect(summary.completedCount).toBe(3);
    expect(summary.perExercise).toEqual([
      { exerciseName: 'Power clean', bestSet: expect.objectContaining({ id: 's2', weight_kg: 85, reps: 2 }) },
      { exerciseName: 'Front squat', bestSet: expect.objectContaining({ id: 's4', weight_kg: 120, reps: 3 }) },
    ]);
  });

  it('breaks weight ties by higher reps', () => {
    const w = workout({ id: 'w1' });
    const exercises: WorkoutExercise[] = [exercise({ id: 'we1', workout_id: 'w1' })];
    const sets: WorkoutSet[] = [
      set({ id: 's1', workout_exercise_id: 'we1', weight_kg: 80, reps: 3, completed_at: ts }),
      set({ id: 's2', workout_exercise_id: 'we1', weight_kg: 80, reps: 5, completed_at: ts }),
    ];
    const summary = workoutSummary(w, exercises, sets);
    expect(summary.perExercise[0].bestSet?.id).toBe('s2');
  });

  it('bestSet is null when an exercise has no completed sets', () => {
    const w = workout({ id: 'w1' });
    const exercises: WorkoutExercise[] = [exercise({ id: 'we1', workout_id: 'w1', exercise_name: 'Spanish squat iso' })];
    const sets: WorkoutSet[] = [
      set({ id: 's1', workout_exercise_id: 'we1', duration_seconds: 40, completed_at: null }),
    ];
    const summary = workoutSummary(w, exercises, sets);
    expect(summary.perExercise).toEqual([{ exerciseName: 'Spanish squat iso', bestSet: null }]);
  });

  it('excludes deleted exercises and deleted sets from the summary', () => {
    const w = workout({ id: 'w1' });
    const exercises: WorkoutExercise[] = [
      exercise({ id: 'we1', workout_id: 'w1', exercise_name: 'Power clean', position: 1 }),
      exercise({ id: 'we2', workout_id: 'w1', exercise_name: 'Deleted exercise', position: 2, deleted: true }),
    ];
    const sets: WorkoutSet[] = [
      set({ id: 's1', workout_exercise_id: 'we1', weight_kg: 80, reps: 2, completed_at: ts, deleted: true }),
      set({ id: 's2', workout_exercise_id: 'we1', weight_kg: 60, reps: 2, completed_at: ts }),
      set({ id: 's3', workout_exercise_id: 'we2', weight_kg: 999, reps: 1, completed_at: ts }),
    ];
    const summary = workoutSummary(w, exercises, sets);
    expect(summary.perExercise).toEqual([
      { exerciseName: 'Power clean', bestSet: expect.objectContaining({ id: 's2' }) },
    ]);
    expect(summary.volumeKg).toBe(60 * 2); // s1 deleted, s3 belongs to a deleted exercise
  });
});

describe('currentExerciseName', () => {
  it('returns the first live exercise (by position) with an incomplete live set', () => {
    const exercises: Record<string, WorkoutExercise> = {
      we1: exercise({ id: 'we1', workout_id: 'w1', position: 1, exercise_name: 'Back squat' }),
      we2: exercise({ id: 'we2', workout_id: 'w1', position: 2, exercise_name: 'Overhead press' }),
      other: exercise({ id: 'other', workout_id: 'w2', position: 1, exercise_name: 'Deadlift' }),
    };
    const sets: Record<string, WorkoutSet> = {
      s1: set({ id: 's1', workout_exercise_id: 'we1', completed_at: ts }),
      s2: set({ id: 's2', workout_exercise_id: 'we2', completed_at: null }),
    };
    expect(currentExerciseName('w1', exercises, sets)).toBe('Overhead press');
  });

  it('falls back to the last live exercise when every set is done, ignoring deleted rows', () => {
    const exercises: Record<string, WorkoutExercise> = {
      we1: exercise({ id: 'we1', workout_id: 'w1', position: 1, exercise_name: 'Back squat' }),
      we2: exercise({ id: 'we2', workout_id: 'w1', position: 2, exercise_name: 'Bench press' }),
      we3: exercise({ id: 'we3', workout_id: 'w1', position: 3, exercise_name: 'Ghosted', deleted: true }),
    };
    const sets: Record<string, WorkoutSet> = {
      s1: set({ id: 's1', workout_exercise_id: 'we2', completed_at: ts }),
      // Incomplete but deleted — must not pull focus back to we1.
      s2: set({ id: 's2', workout_exercise_id: 'we1', completed_at: null, deleted: true }),
    };
    expect(currentExerciseName('w1', exercises, sets)).toBe('Bench press');
  });

  it('returns null for a workout with no live exercises', () => {
    expect(currentExerciseName('w1', {}, {})).toBeNull();
  });
});

describe('finishedWorkoutsNewestFirst', () => {
  it('returns only finished, non-deleted workouts, newest finished_at first', () => {
    const workouts: Record<string, Workout> = {
      active: workout({ id: 'active', finished_at: null }),
      deleted: workout({ id: 'deleted', finished_at: '2026-10-15T00:00:00.000Z', deleted: true }),
      older: workout({ id: 'older', finished_at: '2026-10-07T00:00:00.000Z' }),
      newer: workout({ id: 'newer', finished_at: '2026-10-14T00:00:00.000Z' }),
    };

    expect(finishedWorkoutsNewestFirst(workouts).map((w) => w.id)).toEqual(['newer', 'older']);
  });

  it('skips ghost rows without an id (partial objects left by an assign on a stale key)', () => {
    const workouts: Record<string, Workout> = {
      real: workout({ id: 'real', finished_at: ts }),
      undefined: { finished_at: ts, updated_at: ts } as Workout,
    };

    expect(finishedWorkoutsNewestFirst(workouts).map((w) => w.id)).toEqual(['real']);
  });
});

describe('activeWorkout', () => {
  it('returns null when there is no unfinished, non-deleted workout', () => {
    const workouts: Record<string, Workout> = {
      finished: workout({ id: 'finished', finished_at: ts }),
      deletedActive: workout({ id: 'deletedActive', finished_at: null, deleted: true }),
    };
    expect(activeWorkout(workouts)).toBeNull();
  });

  it('returns the most recently started unfinished workout when several exist', () => {
    const workouts: Record<string, Workout> = {
      finished: workout({ id: 'finished', finished_at: ts }),
      older: workout({ id: 'older', finished_at: null, started_at: '2026-10-14T08:00:00.000Z' }),
      newer: workout({ id: 'newer', finished_at: null, started_at: '2026-10-14T09:00:00.000Z' }),
      deleted: workout({
        id: 'deleted',
        finished_at: null,
        started_at: '2026-10-14T10:00:00.000Z',
        deleted: true,
      }),
    };
    expect(activeWorkout(workouts)?.id).toBe('newer');
  });

  it('never resumes a ghost row without an id', () => {
    const workouts: Record<string, Workout> = {
      undefined: { updated_at: ts } as Workout,
    };
    expect(activeWorkout(workouts)).toBeNull();
  });
});

describe('hasFinishedWorkoutForDay', () => {
  it('true only for a finished, non-deleted workout matching the program_day_id', () => {
    const workouts: Record<string, Workout> = {
      active: workout({ id: 'active', finished_at: null, program_day_id: 'day-1' }),
      finishedOtherDay: workout({ id: 'finishedOtherDay', finished_at: ts, program_day_id: 'day-2' }),
      finishedDeleted: workout({
        id: 'finishedDeleted',
        finished_at: ts,
        program_day_id: 'day-1',
        deleted: true,
      }),
      finishedThisDay: workout({ id: 'finishedThisDay', finished_at: ts, program_day_id: 'day-1' }),
    };
    expect(hasFinishedWorkoutForDay(workouts, 'day-1')).toBe(true);
    expect(hasFinishedWorkoutForDay(workouts, 'day-3')).toBe(false);
  });
});

describe('finishedWorkoutSummaries', () => {
  it('pairs each finished workout (newest first) with its workoutSummary', () => {
    const workouts: Record<string, Workout> = {
      active: workout({ id: 'active', finished_at: null }),
      older: workout({
        id: 'older',
        title: 'Older session',
        started_at: '2026-10-07T10:00:00.000Z',
        finished_at: '2026-10-07T10:30:00.000Z',
      }),
      newer: workout({
        id: 'newer',
        title: 'Newer session',
        started_at: '2026-10-14T10:00:00.000Z',
        finished_at: '2026-10-14T10:20:00.000Z',
      }),
    };
    const workoutExercises: Record<string, WorkoutExercise> = {
      we_older: exercise({ id: 'we_older', workout_id: 'older', exercise_name: 'Squat' }),
      we_newer: exercise({ id: 'we_newer', workout_id: 'newer', exercise_name: 'Bench' }),
    };
    const sets: Record<string, WorkoutSet> = {
      s_older: set({ id: 's_older', workout_exercise_id: 'we_older', weight_kg: 50, reps: 5, completed_at: ts }),
      s_newer: set({ id: 's_newer', workout_exercise_id: 'we_newer', weight_kg: 40, reps: 8, completed_at: ts }),
    };

    const result = finishedWorkoutSummaries(workouts, workoutExercises, sets);

    expect(result.map((r) => r.workout.id)).toEqual(['newer', 'older']);
    expect(result[0].summary.volumeKg).toBe(40 * 8);
    expect(result[0].summary.durationSeconds).toBe(20 * 60);
    expect(result[1].summary.volumeKg).toBe(50 * 5);
  });
});

describe('formatWorkoutDuration', () => {
  it('formats under an hour as mm:ss', () => {
    expect(formatWorkoutDuration(65)).toBe('1:05');
    expect(formatWorkoutDuration(0)).toBe('0:00');
  });

  it('formats an hour or more as h:mm (no seconds)', () => {
    expect(formatWorkoutDuration(3660)).toBe('1:01');
    expect(formatWorkoutDuration(7325)).toBe('2:02');
  });
});

describe('activityDateLabel', () => {
  it('reads day-of-month and a short month label off the local calendar', () => {
    expect(activityDateLabel('2026-10-14T10:00:00.000Z')).toEqual({ day: 14, month: 'OCT' });
    expect(activityDateLabel('2026-01-02T10:00:00.000Z')).toEqual({ day: 2, month: 'JAN' });
  });
});

describe('activityMetaLabel', () => {
  it('composes duration · volume · set count, singular/plural', () => {
    expect(activityMetaLabel(65, 1234.6, 1)).toBe('1:05 · 1235 kg · 1 set');
    expect(activityMetaLabel(3660, 500, 12)).toBe('1:01 · 500 kg · 12 sets');
  });
});

describe('searchExercises', () => {
  const exercises: Record<string, Exercise> = {
    romanian: libraryExercise({ id: 'romanian', name: 'Română deadlift', muscle_group: 'Legs' }),
    squat: libraryExercise({ id: 'squat', name: 'Back squat', muscle_group: 'Legs' }),
    bench: libraryExercise({ id: 'bench', name: 'Bench press', muscle_group: 'Chest' }),
    row: libraryExercise({ id: 'row', name: 'Barbell row', muscle_group: 'Back' }),
    goneDeadlift: libraryExercise({ id: 'gone', name: 'Deadlift (old)', muscle_group: 'Legs', deleted: true }),
  };

  it('matches case/diacritic-insensitively: "romana" (ASCII) finds "Română" (diacritics)', () => {
    const result = searchExercises(exercises, 'romana', null);
    expect(result.map((e) => e.id)).toEqual(['romanian']);
  });

  it('matches case-insensitively on a plain substring', () => {
    const result = searchExercises(exercises, 'BENCH', null);
    expect(result.map((e) => e.id)).toEqual(['bench']);
  });

  it('excludes deleted exercises even when the name matches', () => {
    const result = searchExercises(exercises, 'deadlift', null);
    expect(result.map((e) => e.id)).toEqual(['romanian']);
  });

  it('applies an exact muscle_group filter when group is non-null', () => {
    const result = searchExercises(exercises, '', 'Legs');
    expect(result.map((e) => e.id).sort()).toEqual(['romanian', 'squat']);
  });

  it('ignores the group filter when group is null (all groups)', () => {
    const result = searchExercises(exercises, 'press', null);
    expect(result.map((e) => e.id)).toEqual(['bench']);
  });

  it('returns results alphabetical by name', () => {
    const result = searchExercises(exercises, '', null);
    expect(result.map((e) => e.name)).toEqual(['Back squat', 'Barbell row', 'Bench press', 'Română deadlift']);
  });

  it('empty query matches everything (non-deleted, optionally group-filtered)', () => {
    const result = searchExercises(exercises, '', null);
    expect(result).toHaveLength(4);
  });
});

describe('recentExerciseIds', () => {
  function workoutRow(overrides: Partial<Workout> & Pick<Workout, 'id'>): Workout {
    return {
      user_id: 'user-1',
      title: 'Workout',
      program_day_id: null,
      started_at: ts,
      finished_at: null,
      notes: null,
      created_at: ts,
      updated_at: ts,
      deleted: false,
      ...overrides,
    };
  }

  it('returns distinct exercise_ids from finished workouts, most-recently-finished first', () => {
    const workouts: Record<string, Workout> = {
      w1: workoutRow({ id: 'w1', finished_at: '2026-10-10T10:00:00.000Z' }),
      w2: workoutRow({ id: 'w2', finished_at: '2026-10-12T10:00:00.000Z' }),
    };
    const workoutExercises: Record<string, WorkoutExercise> = {
      we1: exercise({ id: 'we1', workout_id: 'w1', exercise_id: 'ex-squat' }),
      we2: exercise({ id: 'we2', workout_id: 'w2', exercise_id: 'ex-bench' }),
    };

    expect(recentExerciseIds(workouts, workoutExercises, 8)).toEqual(['ex-bench', 'ex-squat']);
  });

  it('dedupes repeated exercise_ids, keeping the most recent occurrence only', () => {
    const workouts: Record<string, Workout> = {
      w1: workoutRow({ id: 'w1', finished_at: '2026-10-10T10:00:00.000Z' }),
      w2: workoutRow({ id: 'w2', finished_at: '2026-10-12T10:00:00.000Z' }),
    };
    const workoutExercises: Record<string, WorkoutExercise> = {
      we1: exercise({ id: 'we1', workout_id: 'w1', exercise_id: 'ex-squat' }),
      we2: exercise({ id: 'we2', workout_id: 'w2', exercise_id: 'ex-squat' }),
    };

    expect(recentExerciseIds(workouts, workoutExercises, 8)).toEqual(['ex-squat']);
  });

  it('excludes unfinished workouts', () => {
    const workouts: Record<string, Workout> = {
      active: workoutRow({ id: 'active', finished_at: null }),
    };
    const workoutExercises: Record<string, WorkoutExercise> = {
      we1: exercise({ id: 'we1', workout_id: 'active', exercise_id: 'ex-squat' }),
    };

    expect(recentExerciseIds(workouts, workoutExercises, 8)).toEqual([]);
  });

  it('excludes deleted workouts and deleted workout_exercises', () => {
    const workouts: Record<string, Workout> = {
      w1: workoutRow({ id: 'w1', finished_at: '2026-10-10T10:00:00.000Z', deleted: true }),
      w2: workoutRow({ id: 'w2', finished_at: '2026-10-12T10:00:00.000Z' }),
    };
    const workoutExercises: Record<string, WorkoutExercise> = {
      we1: exercise({ id: 'we1', workout_id: 'w1', exercise_id: 'ex-squat' }),
      we2: exercise({ id: 'we2', workout_id: 'w2', exercise_id: 'ex-bench', deleted: true }),
    };

    expect(recentExerciseIds(workouts, workoutExercises, 8)).toEqual([]);
  });

  it('excludes null exercise_ids (unmatched programme rows)', () => {
    const workouts: Record<string, Workout> = {
      w1: workoutRow({ id: 'w1', finished_at: '2026-10-10T10:00:00.000Z' }),
    };
    const workoutExercises: Record<string, WorkoutExercise> = {
      we1: exercise({ id: 'we1', workout_id: 'w1', exercise_id: null }),
    };

    expect(recentExerciseIds(workouts, workoutExercises, 8)).toEqual([]);
  });

  it('caps the result length', () => {
    const workouts: Record<string, Workout> = {
      w1: workoutRow({ id: 'w1', finished_at: '2026-10-01T10:00:00.000Z' }),
      w2: workoutRow({ id: 'w2', finished_at: '2026-10-02T10:00:00.000Z' }),
      w3: workoutRow({ id: 'w3', finished_at: '2026-10-03T10:00:00.000Z' }),
    };
    const workoutExercises: Record<string, WorkoutExercise> = {
      we1: exercise({ id: 'we1', workout_id: 'w1', exercise_id: 'ex-1' }),
      we2: exercise({ id: 'we2', workout_id: 'w2', exercise_id: 'ex-2' }),
      we3: exercise({ id: 'we3', workout_id: 'w3', exercise_id: 'ex-3' }),
    };

    const result = recentExerciseIds(workouts, workoutExercises, 2);
    expect(result).toEqual(['ex-3', 'ex-2']);
  });
});

describe('savedTimes', () => {
  const start = '2026-10-15T08:00:00.000Z';
  const now = new Date('2026-10-15T09:05:00.000Z');

  it('finishes now when the start is unchanged', () => {
    expect(savedTimes(start, new Date(start), now)).toEqual({
      started_at: start,
      finished_at: now.toISOString(),
    });
  });

  it('keeps the trained duration when the start moves', () => {
    const yesterday = new Date('2026-10-14T18:30:00.000Z');
    expect(savedTimes(start, yesterday, now)).toEqual({
      started_at: yesterday.toISOString(),
      finished_at: '2026-10-14T19:35:00.000Z',
    });
  });

  it('never yields a negative duration', () => {
    const future = new Date('2026-10-15T10:00:00.000Z');
    const result = savedTimes(future.toISOString(), future, now);
    expect(result.finished_at).toBe(result.started_at);
  });
});
