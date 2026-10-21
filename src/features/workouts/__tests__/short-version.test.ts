import type { DayExercise, ProgramDay } from '@/features/programs/types';
import { shortVersionOf } from '../short-version';

const ex = (position: number, name: string, sets: number, reps = '5'): DayExercise => ({
  id: `e${position}`, position, exerciseName: name, exerciseId: null, sets, reps, load: null, notes: null,
});

const day = (notes: string | null, exercises: DayExercise[]): ProgramDay => ({
  id: 'd1', position: 1, name: 'Mon — Lower', kind: 'lifting', notes, exercises,
});

const lifts = [ex(1, 'Back Squat', 4), ex(2, 'Romanian Deadlift (Barbell)', 3, '8'), ex(3, 'Pull-Up', 4, '6'), ex(4, 'Plank', 3, '30 s')];

describe('shortVersionOf', () => {
  it('follows the coach’s line: its exercises, sets, reps and minutes', () => {
    const short = shortVersionOf(day('Short on time (10 min): Pull-Up 2x5, Back Squat 2 × 3', lifts))!;
    expect(short.minutes).toBe(10);
    expect(short.day.exercises.map((e) => [e.exerciseName, e.sets, e.reps, e.position])).toEqual([
      ['Pull-Up', 2, '5', 1],
      ['Back Squat', 2, '3', 2],
    ]);
  });

  it('matches names loosely, ignoring the equipment in brackets', () => {
    const short = shortVersionOf(day('Heavy day.\nShort on time (15 min): Romanian Deadlift 2x6', lifts))!;
    expect(short.day.exercises).toHaveLength(1);
    expect(short.day.exercises[0].exerciseName).toBe('Romanian Deadlift (Barbell)');
  });

  it('falls back to the first three exercises at two sets when there’s no line', () => {
    const short = shortVersionOf(day('Go heavy.', lifts))!;
    expect(short.minutes).toBe(15);
    expect(short.day.exercises.map((e) => [e.exerciseName, e.sets])).toEqual([
      ['Back Squat', 2],
      ['Romanian Deadlift (Barbell)', 2],
      ['Pull-Up', 2],
    ]);
  });

  it('falls back too when the line names nothing on the day', () => {
    expect(shortVersionOf(day('Short on time (15 min): Bench Press 2x5', lifts))!.day.exercises).toHaveLength(3);
  });

  it('has nothing to cut on a day with no exercises', () => {
    expect(shortVersionOf(day(null, []))).toBeNull();
  });
});
