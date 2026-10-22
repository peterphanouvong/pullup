import type { DayExercise, ProgramDay } from '@/features/programs/types';
import { buildWorkoutFromDay, composeTarget } from './start';
import type { WorkoutExercise, WorkoutSet } from './types';

/**
 * Moving a live workout between a day's full and short versions (see
 * `short-version.ts`), for when you change your mind halfway through.
 *
 * The workout is reshaped in place, never rebuilt: anything you've ticked
 * off stays. Each exercise in the target ends up with the target's set
 * count, made up of its completed sets first and then pending ones (added
 * or dropped to fit). An exercise from the programme day that the target
 * leaves out goes, or, if you'd started it, keeps only its completed sets.
 * One you added yourself stays as it is. Both sit after the target's.
 *
 * Pure: it returns the writes, and `switchWorkoutVersion` applies them.
 */

export interface ReshapeExercise extends WorkoutExercise {
  sets: WorkoutSet[];
}

export interface Reshape {
  removeExerciseIds: string[];
  removeSetIds: string[];
  addExercises: WorkoutExercise[];
  addSets: WorkoutSet[];
  positions: { id: string; position: number }[];
  /** New ghost text for the pending sets that stay. */
  targets: { id: string; target: string }[];
}

export interface ReshapeOpts {
  workoutId: string;
  userId: string;
  now: Date;
  idGen: () => string;
}

function normalise(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function sameExercise(row: WorkoutExercise, dayExercise: DayExercise): boolean {
  if (row.exercise_id != null && dayExercise.exerciseId != null) return row.exercise_id === dayExercise.exerciseId;
  return normalise(row.exercise_name) === normalise(dayExercise.exerciseName);
}

export function reshapeWorkout(
  current: ReshapeExercise[],
  full: ProgramDay,
  target: ProgramDay,
  opts: ReshapeOpts,
): Reshape {
  const out: Reshape = { removeExerciseIds: [], removeSetIds: [], addExercises: [], addSets: [], positions: [], targets: [] };
  const nowIso = opts.now.toISOString();
  const used = new Set<string>();
  const order: string[] = [];

  for (const dayExercise of [...target.exercises].sort((a, b) => a.position - b.position)) {
    const row = current.find((r) => !used.has(r.id) && sameExercise(r, dayExercise));
    const want = dayExercise.sets ?? 1;
    const ghost = composeTarget(want, dayExercise.reps, dayExercise.load);

    if (!row) {
      const built = buildWorkoutFromDay({ ...target, exercises: [dayExercise] }, {
        userId: opts.userId,
        programDayId: target.id,
        now: opts.now,
        idGen: opts.idGen,
      });
      const added = { ...built.exercises[0], workout_id: opts.workoutId };
      out.addExercises.push(added);
      out.addSets.push(...built.sets);
      order.push(added.id);
      continue;
    }

    used.add(row.id);
    order.push(row.id);
    const sets = [...row.sets].sort((a, b) => a.position - b.position);
    const done = sets.filter((s) => s.completed_at != null);
    const pending = sets.filter((s) => s.completed_at == null);
    const keep = Math.max(0, want - done.length);

    for (const set of pending.slice(keep)) out.removeSetIds.push(set.id);
    for (const set of pending.slice(0, keep)) {
      if (set.target !== ghost) out.targets.push({ id: set.id, target: ghost });
    }

    // New sets copy the last one's shape, the way "Add Set" does.
    const last = sets[sets.length - 1];
    let position = last?.position ?? 0;
    for (let i = pending.length; i < keep; i++) {
      position += 1;
      out.addSets.push({
        id: opts.idGen(),
        user_id: row.user_id,
        workout_exercise_id: row.id,
        position,
        set_type: 'working',
        weight_kg: last?.weight_kg ?? null,
        reps: last?.reps ?? null,
        duration_seconds: last?.duration_seconds ?? null,
        target: ghost,
        completed_at: null,
        created_at: nowIso,
        updated_at: nowIso,
        deleted: false,
      });
    }
  }

  for (const row of current) {
    if (used.has(row.id)) continue;
    const fromDay = full.exercises.some((e) => sameExercise(row, e));
    const started = row.sets.some((s) => s.completed_at != null);
    if (fromDay && !started) {
      out.removeExerciseIds.push(row.id);
      out.removeSetIds.push(...row.sets.map((s) => s.id));
      continue;
    }
    // Started but not in the target: what's done stays, the rest goes.
    if (fromDay) out.removeSetIds.push(...row.sets.filter((s) => s.completed_at == null).map((s) => s.id));
    order.push(row.id);
  }

  const before = new Map(current.map((r) => [r.id, r.position]));
  order.forEach((id, i) => {
    const added = out.addExercises.find((e) => e.id === id);
    if (added) added.position = i + 1;
    else if (before.get(id) !== i + 1) out.positions.push({ id, position: i + 1 });
  });

  return out;
}
