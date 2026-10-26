import { inferLogType, logTypeOf } from '../log-type';
import type { WorkoutExercise, WorkoutSet } from '../types';

describe('inferLogType', () => {
  it.each([
    ['Sprint', '4 × 20 m', 'duration'],
    ['Flying 10s', '20 m', 'duration'],
    ['Acceleration sprints', '6', 'duration'],
    ['Plank', '30 s', 'duration'],
    ['Copenhagen plank', '20 s/side', 'duration'],
    ['Pogo jumps', '20', 'reps'],
    ['Box jump', '3', 'reps'],
    ['Pull-Up', '6-8', 'reps'],
    ['Weighted pull-up', '5', 'weight_reps'],
    ['Back Squat', '5', 'weight_reps'],
    ['Bench press', '3 + 1 single', 'weight_reps'],
  ] as const)('%s (%s) is %s', (name, reps, expected) => {
    expect(inferLogType(name, reps)).toBe(expected);
  });
});

describe('logTypeOf', () => {
  const base = {
    id: 'we1', user_id: 'u', workout_id: 'w', exercise_id: null, exercise_name: 'Sprint', position: 1,
    rest_seconds: 150, notes: null, created_at: '', updated_at: '', deleted: false,
  } satisfies WorkoutExercise;
  const set = (patch: Partial<WorkoutSet>): WorkoutSet => ({
    id: 's', user_id: 'u', workout_exercise_id: 'we1', position: 1, set_type: 'working', weight_kg: null, reps: null,
    duration_seconds: null, target: null, completed_at: null, created_at: '', updated_at: '', deleted: false, ...patch,
  });

  it('uses the stored type when there is one', () => {
    expect(logTypeOf({ ...base, log_type: 'reps', sets: [set({ weight_kg: 60 })] })).toBe('reps');
  });

  it('reads older rows the old way', () => {
    expect(logTypeOf({ ...base, sets: [set({ duration_seconds: 30 })] })).toBe('duration');
    expect(logTypeOf({ ...base, sets: [set({ target: '3 × 30 s' })] })).toBe('duration');
    expect(logTypeOf({ ...base, sets: [set({ target: '4 × 5' })] })).toBe('weight_reps');
  });
});
