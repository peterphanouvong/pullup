import type { DayExercise, ProgramDay } from '@/features/programs/types';
import { buildWorkoutFromDay } from '../start';
import { reshapeWorkout, type Reshape, type ReshapeExercise } from '../reshape';
import { shortVersionOf } from '../short-version';
import type { WorkoutExercise, WorkoutSet } from '../types';

const ex = (position: number, name: string, sets: number, reps = '5'): DayExercise => ({
  id: `e${position}`, position, exerciseName: name, exerciseId: null, sets, reps, load: null, notes: null,
});

const full: ProgramDay = {
  id: 'd1', position: 1, name: 'Lower', kind: 'lifting', notes: null,
  exercises: [ex(1, 'Back Squat', 4), ex(2, 'Romanian Deadlift', 3, '8'), ex(3, 'Pull-Up', 4, '6'), ex(4, 'Plank', 3, '30 s')],
};
const short = shortVersionOf(full)!.day;

let n = 0;
const opts = { workoutId: 'w1', userId: 'u1', now: new Date('2026-10-22T08:00:00Z'), idGen: () => `id${++n}` };

/** A live workout as the store holds it, built from `day`. */
function live(day: ProgramDay): ReshapeExercise[] {
  const built = buildWorkoutFromDay(day, { ...opts, programDayId: day.id });
  return built.exercises.map((e) => ({ ...e, workout_id: 'w1', sets: built.sets.filter((s) => s.workout_exercise_id === e.id) }));
}

/** Applies a reshape to plain rows, the way `switchWorkoutVersion` does to the store. */
function apply(rows: ReshapeExercise[], plan: Reshape): ReshapeExercise[] {
  const exercises: WorkoutExercise[] = [...rows, ...plan.addExercises].filter((e) => !plan.removeExerciseIds.includes(e.id));
  const sets: WorkoutSet[] = [...rows.flatMap((r) => r.sets), ...plan.addSets].filter((s) => !plan.removeSetIds.includes(s.id));
  return exercises
    .map((e) => ({ ...e, position: plan.positions.find((p) => p.id === e.id)?.position ?? e.position }))
    .sort((a, b) => a.position - b.position)
    .map((e) => ({ ...e, sets: sets.filter((s) => s.workout_exercise_id === e.id) }));
}

const shape = (rows: ReshapeExercise[]) => rows.map((r) => [r.exercise_name, r.sets.length]);

describe('reshapeWorkout', () => {
  it('cuts a fresh full workout down to the short version', () => {
    const rows = live(full);
    expect(shape(apply(rows, reshapeWorkout(rows, full, short, opts)))).toEqual([['Back Squat', 2], ['Romanian Deadlift', 2], ['Pull-Up', 2]]);
  });

  it('grows a short workout back to the full day', () => {
    const rows = live(short);
    const after = apply(rows, reshapeWorkout(rows, full, full, opts));
    expect(shape(after)).toEqual([['Back Squat', 4], ['Romanian Deadlift', 3], ['Pull-Up', 4], ['Plank', 3]]);
    expect(after[3].workout_id).toBe('w1');
  });

  it('keeps completed sets, and anything started, when cutting down', () => {
    const rows = live(full);
    for (const set of rows[0].sets.slice(0, 3)) set.completed_at = '2026-10-22T08:10:00Z';
    rows[3].sets[0].completed_at = '2026-10-22T08:20:00Z';
    const after = apply(rows, reshapeWorkout(rows, full, short, opts));
    // Three squats done is more than the short version's two: they all stay,
    // with no pending ones left. The started plank keeps its one done set, at the end.
    expect(shape(after)).toEqual([['Back Squat', 3], ['Romanian Deadlift', 2], ['Pull-Up', 2], ['Plank', 1]]);
  });

  it('leaves exercises you added yourself alone', () => {
    const rows = live(full);
    rows.push({ ...rows[0], id: 'mine', exercise_name: 'Calf Raise', position: 5, sets: [] });
    const after = apply(rows, reshapeWorkout(rows, full, short, opts));
    expect(after.map((r) => r.exercise_name)).toEqual(['Back Squat', 'Romanian Deadlift', 'Pull-Up', 'Calf Raise']);
  });

  it('retargets the pending sets it keeps', () => {
    const plan = reshapeWorkout(live(short), full, full, opts);
    expect(plan.targets.every((t) => t.target === '4 × 5' || t.target === '3 × 8' || t.target === '4 × 6')).toBe(true);
    expect(plan.targets.length).toBeGreaterThan(0);
  });
});
