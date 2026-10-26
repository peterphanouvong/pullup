import type { Workout, WorkoutExercise, WorkoutSet } from '@/features/workouts/types';
import {
  estimatedOneRepMax,
  exerciseHistory,
  logbookFrom,
  personalBests,
  recordsSetIn,
  weeklyTotals,
  workoutCard,
} from '../stats';

const workouts: Workout[] = [];
const exercises: WorkoutExercise[] = [];
const sets: WorkoutSet[] = [];

/** A finished session: [exercise name, [kg, reps][]] per exercise. */
function session(id: string, start: string, minutes: number, lifts: [string, [number | null, number | null][]][]) {
  const end = new Date(new Date(start).getTime() + minutes * 60_000).toISOString();
  workouts.push({
    id, user_id: 'u', title: `Session ${id}`, program_day_id: null, started_at: start, finished_at: end,
    notes: null, created_at: start, updated_at: start, deleted: false,
  });
  lifts.forEach(([name, rows], i) => {
    const exId = `${id}-e${i}`;
    exercises.push({
      id: exId, user_id: 'u', workout_id: id, exercise_id: null, exercise_name: name, position: i + 1,
      rest_seconds: 150, notes: null, created_at: start, updated_at: start, deleted: false,
    });
    rows.forEach(([kg, reps], j) =>
      sets.push({
        id: `${exId}-s${j}`, user_id: 'u', workout_exercise_id: exId, position: j + 1, set_type: 'working',
        weight_kg: kg, reps, duration_seconds: null, target: null, completed_at: end,
        created_at: start, updated_at: start, deleted: false,
      }),
    );
  });
}

session('a', '2026-10-13T08:00:00.000Z', 60, [['Back Squat', [[100, 5], [100, 5]]], ['Pull-Up', [[null, 8]]]]);
session('b', '2026-10-20T08:00:00.000Z', 45, [['back squat', [[105, 5]]], ['Pull-Up', [[null, 10]]]]);
// Unfinished: never counts.
workouts.push({ ...workouts[0], id: 'c', finished_at: null, started_at: '2026-10-21T08:00:00.000Z' });

const book = logbookFrom(workouts, exercises, sets);

describe('stats', () => {
  it('only counts finished workouts, newest first', () => {
    expect(book.workouts.map((w) => w.id)).toEqual(['b', 'a']);
  });

  it('totals weeks up to this one, with empty weeks as zeros', () => {
    const totals = weeklyTotals(book, 'volume', new Date('2026-10-22T12:00:00Z'), 3);
    expect(totals.map((t) => t.value)).toEqual([0, 1000, 525]);
    expect(weeklyTotals(book, 'sets', new Date('2026-10-22T12:00:00Z'), 2).map((t) => t.value)).toEqual([3, 2]);
  });

  it('keeps bests per exercise, across spellings', () => {
    const [squat, pullUp] = personalBests(book);
    expect(squat.sessions).toBe(2);
    expect(squat.heaviest).toMatchObject({ weightKg: 105, at: '2026-10-20T08:00:00.000Z' });
    expect(pullUp.mostReps?.reps).toBe(10);
    expect(pullUp.heaviest).toBeNull();
  });

  it('counts a heavier session as a record, a first time as none', () => {
    expect(recordsSetIn(book, 'a')).toBe(0);
    expect(recordsSetIn(book, 'b')).toBe(1);
    expect(workoutCard(book, book.workouts[0])).toMatchObject({ durationSeconds: 2700, volumeKg: 525, records: 1 });
  });

  it('lists one exercise’s sessions newest first', () => {
    const history = exerciseHistory(book, 'back squat');
    expect(history.map((h) => h.best.weight_kg)).toEqual([105, 100]);
    expect(estimatedOneRepMax({ weight_kg: 100, reps: 5 })).toBeCloseTo(116.67, 1);
  });

  it('copes with the store handing timestamps back as Date objects', () => {
    // Legend-State revives ISO strings into Dates; the types still say string.
    const revived = workouts.map((w) => ({
      ...w,
      started_at: new Date(w.started_at) as unknown as string,
      finished_at: w.finished_at && (new Date(w.finished_at) as unknown as string),
    }));
    const live = logbookFrom(revived, exercises, sets);
    expect(live.workouts.map((w) => w.id)).toEqual(['b', 'a']);
    expect(personalBests(live).map((b) => b.key)).toEqual(['back squat', 'pull-up']);
    expect(recordsSetIn(live, 'b')).toBe(1);
  });
});
