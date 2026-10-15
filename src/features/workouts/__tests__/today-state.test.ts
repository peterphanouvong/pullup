import { dayMetrics, dayState, weekCompletion } from '../today-state';
import type { ProgramDay } from '@/features/programs/types';
import type { Workout } from '../types';

const ts = '2026-10-14T10:00:00.000Z';

function workout(overrides: Partial<Workout> & Pick<Workout, 'id'>): Workout {
  return {
    user_id: 'user-1',
    title: 'W',
    program_day_id: null,
    started_at: ts,
    finished_at: ts,
    notes: null,
    created_at: ts,
    updated_at: ts,
    deleted: false,
    ...overrides,
  };
}

function day(overrides: Partial<ProgramDay> & Pick<ProgramDay, 'id' | 'position' | 'kind'>): ProgramDay {
  return { name: 'Day', notes: null, exercises: [], ...overrides };
}

describe('weekCompletion', () => {
  it('marks only days with a finished, non-deleted workout', () => {
    const workouts: Record<string, Workout> = {
      done: workout({ id: 'done', program_day_id: 'd1' }),
      unfinished: workout({ id: 'unfinished', program_day_id: 'd2', finished_at: null }),
      deleted: workout({ id: 'deleted', program_day_id: 'd3', deleted: true }),
      otherDay: workout({ id: 'otherDay', program_day_id: 'elsewhere' }),
    };
    expect(weekCompletion(workouts, ['d1', 'd2', 'd3', 'd4'])).toEqual({
      d1: true,
      d2: false,
      d3: false,
      d4: false,
    });
  });
});

describe('dayState', () => {
  const lifting = (position: number) => day({ id: `l${position}`, position, kind: 'lifting' });

  it('completed lifting day is done even when past or today', () => {
    expect(dayState(lifting(1), 3, true)).toBe('done');
    expect(dayState(lifting(3), 3, true)).toBe('done');
  });

  it('past undone lifting day is missed; today and future are upcoming', () => {
    expect(dayState(lifting(2), 3, false)).toBe('missed');
    expect(dayState(lifting(3), 3, false)).toBe('upcoming');
    expect(dayState(lifting(5), 3, false)).toBe('upcoming');
  });

  it('first/last-day boundaries behave', () => {
    expect(dayState(lifting(1), 1, false)).toBe('upcoming'); // Monday, today
    expect(dayState(lifting(7), 7, false)).toBe('upcoming'); // Sunday, today
    expect(dayState(lifting(1), 7, false)).toBe('missed');
  });

  it('non-lifting days are info regardless of date or completion flag', () => {
    expect(dayState(day({ id: 'c', position: 1, kind: 'court' }), 5, false)).toBe('info');
    expect(dayState(day({ id: 'r', position: 5, kind: 'rest' }), 5, false)).toBe('info');
    expect(dayState(day({ id: 'x', position: 7, kind: 'comp' }), 5, true)).toBe('info');
  });
});

describe('dayMetrics', () => {
  function ex(sets: number | null, position: number) {
    return {
      id: `e${position}`,
      position,
      exerciseName: 'Back squat',
      exerciseId: null,
      sets,
      reps: null,
      load: null,
      notes: null,
    };
  }

  it('counts exercises and sums prescribed sets on a lifting day', () => {
    const d = day({ id: 'd1', position: 1, kind: 'lifting', exercises: [ex(5, 1), ex(4, 2), ex(3, 3)] });
    expect(dayMetrics(d)).toEqual({ exercises: 3, sets: 12 });
  });

  it('treats an exercise with no prescribed sets as contributing none', () => {
    const d = day({ id: 'd1', position: 1, kind: 'lifting', exercises: [ex(4, 1), ex(null, 2)] });
    expect(dayMetrics(d)).toEqual({ exercises: 2, sets: 4 });
  });

  it('returns null for non-lifting days', () => {
    for (const kind of ['court', 'rest', 'comp'] as const) {
      expect(dayMetrics(day({ id: 'd', position: 1, kind }))).toBeNull();
    }
  });
});
