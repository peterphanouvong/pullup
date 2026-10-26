/**
 * Training stats over a logbook: weekly totals for the profile chart,
 * personal bests, one exercise's history, and the records a session set.
 *
 * Pure, over the same row shapes the workout store syncs, so it runs on
 * your own store and on a crewmate's rows fetched for their profile alike.
 * Only finished, non-deleted workouts and completed sets count: an unticked
 * set is a plan, not a lift.
 */

import { fromKey, localDayOf } from '@/features/programs/calendar';
import { mondayOf } from '@/features/programs/schedule';
import type { Workout, WorkoutExercise, WorkoutSet } from '@/features/workouts/types';

// Timestamps are compared as instants, never as text: rows typed as ISO
// strings come out of the synced store as Date objects, which have no
// `localeCompare` (the crash in build 7).
const time = (iso: string) => new Date(iso).getTime();

export interface Logbook {
  /** Finished, live workouts, newest first. */
  workouts: Workout[];
  exercisesByWorkout: Map<string, WorkoutExercise[]>;
  setsByExercise: Map<string, WorkoutSet[]>;
}

/** Builds a logbook from id-keyed records (the store) or plain arrays (a
 * fetch). Drops anything deleted or unfinished. */
export function logbookFrom(
  workouts: Record<string, Workout> | Workout[],
  exercises: Record<string, WorkoutExercise> | WorkoutExercise[],
  sets: Record<string, WorkoutSet> | WorkoutSet[],
): Logbook {
  const finished = Object.values(workouts)
    .filter((w): w is Workout => !!w && !w.deleted && w.finished_at != null)
    .sort((a, b) => time(b.started_at) - time(a.started_at));
  const ids = new Set(finished.map((w) => w.id));

  const exercisesByWorkout = new Map<string, WorkoutExercise[]>();
  for (const e of Object.values(exercises)) {
    if (!e || e.deleted || !ids.has(e.workout_id)) continue;
    const list = exercisesByWorkout.get(e.workout_id) ?? [];
    list.push(e);
    exercisesByWorkout.set(e.workout_id, list);
  }
  for (const list of exercisesByWorkout.values()) list.sort((a, b) => a.position - b.position);

  const setsByExercise = new Map<string, WorkoutSet[]>();
  for (const s of Object.values(sets)) {
    if (!s || s.deleted || s.completed_at == null) continue;
    const list = setsByExercise.get(s.workout_exercise_id) ?? [];
    list.push(s);
    setsByExercise.set(s.workout_exercise_id, list);
  }
  for (const list of setsByExercise.values()) list.sort((a, b) => a.position - b.position);

  return { workouts: finished, exercisesByWorkout, setsByExercise };
}

/** One name per exercise across sessions, however it was spelt or linked. */
export function exerciseKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Estimated one-rep max (Epley), only from sets heavy enough to say
 * something: 1 to 12 reps with a weight. */
export function estimatedOneRepMax(set: Pick<WorkoutSet, 'weight_kg' | 'reps'>): number | null {
  if (set.weight_kg == null || set.weight_kg <= 0 || set.reps == null || set.reps < 1 || set.reps > 12) return null;
  return set.reps === 1 ? set.weight_kg : set.weight_kg * (1 + set.reps / 30);
}

function setsOf(book: Logbook, workoutId: string): WorkoutSet[] {
  return (book.exercisesByWorkout.get(workoutId) ?? []).flatMap((e) => book.setsByExercise.get(e.id) ?? []);
}

export type WeeklyMetric = 'duration' | 'volume' | 'sets';

export interface WeekTotal {
  /** Monday, YYYY-MM-DD. */
  monday: string;
  /** Hours for duration, kg for volume, a count for sets. */
  value: number;
}

/** The last `weeks` weeks ending with this one, oldest first, zeros
 * included so the chart's gaps are real gaps. */
export function weeklyTotals(book: Logbook, metric: WeeklyMetric, now: Date, weeks = 12): WeekTotal[] {
  const totals = new Map<string, number>();
  for (const w of book.workouts) {
    const monday = mondayOf(fromKey(localDayOf(w.started_at)));
    const sets = setsOf(book, w.id);
    const value =
      metric === 'duration'
        ? Math.max(0, new Date(w.finished_at!).getTime() - new Date(w.started_at).getTime()) / 3_600_000
        : metric === 'volume'
          ? sets.reduce((t, s) => t + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)
          : sets.length;
    totals.set(monday, (totals.get(monday) ?? 0) + value);
  }
  const out: WeekTotal[] = [];
  const start = fromKey(mondayOf(now));
  for (let i = weeks - 1; i >= 0; i--) {
    const monday = mondayOf(new Date(start.getFullYear(), start.getMonth(), start.getDate() - 7 * i));
    out.push({ monday, value: totals.get(monday) ?? 0 });
  }
  return out;
}

export interface ExerciseBest {
  key: string;
  /** As last logged. */
  name: string;
  sessions: number;
  lastDoneAt: string;
  heaviest: { weightKg: number; reps: number | null; at: string } | null;
  oneRepMax: { kg: number; at: string } | null;
  mostReps: { reps: number; at: string } | null;
  longest: { seconds: number; at: string } | null;
}

/** Every exercise you've logged, with its bests, most-done first. */
export function personalBests(book: Logbook): ExerciseBest[] {
  const byKey = new Map<string, ExerciseBest>();
  // Oldest first, so a later tie doesn't take the date of an earlier best.
  for (const w of [...book.workouts].reverse()) {
    for (const e of book.exercisesByWorkout.get(w.id) ?? []) {
      const sets = book.setsByExercise.get(e.id) ?? [];
      if (sets.length === 0) continue;
      const key = exerciseKey(e.exercise_name);
      const best: ExerciseBest = byKey.get(key) ?? {
        key, name: e.exercise_name, sessions: 0, lastDoneAt: w.started_at,
        heaviest: null, oneRepMax: null, mostReps: null, longest: null,
      };
      best.sessions += 1;
      best.name = e.exercise_name;
      best.lastDoneAt = w.started_at;
      for (const s of sets) {
        if (s.weight_kg != null && s.weight_kg > 0 && (best.heaviest == null || s.weight_kg > best.heaviest.weightKg)) {
          best.heaviest = { weightKg: s.weight_kg, reps: s.reps, at: w.started_at };
        }
        const orm = estimatedOneRepMax(s);
        if (orm != null && (best.oneRepMax == null || orm > best.oneRepMax.kg)) best.oneRepMax = { kg: orm, at: w.started_at };
        if (s.reps != null && s.reps > 0 && (best.mostReps == null || s.reps > best.mostReps.reps)) {
          best.mostReps = { reps: s.reps, at: w.started_at };
        }
        if (s.duration_seconds != null && (best.longest == null || s.duration_seconds > best.longest.seconds)) {
          best.longest = { seconds: s.duration_seconds, at: w.started_at };
        }
      }
      byKey.set(key, best);
    }
  }
  return [...byKey.values()].sort((a, b) => b.sessions - a.sessions || time(b.lastDoneAt) - time(a.lastDoneAt));
}

export interface ExerciseSession {
  workoutId: string;
  workoutTitle: string;
  at: string;
  sets: WorkoutSet[];
  /** Heaviest set, then most reps. */
  best: WorkoutSet;
  oneRepMax: number | null;
}

/** One exercise across your sessions, newest first. */
export function exerciseHistory(book: Logbook, key: string): ExerciseSession[] {
  const out: ExerciseSession[] = [];
  for (const w of book.workouts) {
    for (const e of book.exercisesByWorkout.get(w.id) ?? []) {
      if (exerciseKey(e.exercise_name) !== key) continue;
      const sets = book.setsByExercise.get(e.id) ?? [];
      if (sets.length === 0) continue;
      const best = sets.reduce((a, b) =>
        (b.weight_kg ?? -1) > (a.weight_kg ?? -1) || ((b.weight_kg ?? -1) === (a.weight_kg ?? -1) && (b.reps ?? 0) > (a.reps ?? 0))
          ? b
          : a,
      );
      const orms = sets.map(estimatedOneRepMax).filter((n): n is number => n != null);
      out.push({
        workoutId: w.id,
        workoutTitle: w.title,
        at: w.started_at,
        sets,
        best,
        oneRepMax: orms.length > 0 ? Math.max(...orms) : null,
      });
    }
  }
  return out;
}

/** How many exercises in this session beat everything logged before it,
 * on heaviest weight or estimated max: the "Records" count on a card. */
export function recordsSetIn(book: Logbook, workoutId: string): number {
  const workout = book.workouts.find((w) => w.id === workoutId);
  if (!workout) return 0;
  const earlier = book.workouts.filter((w) => time(w.started_at) < time(workout.started_at));
  const priorBest = new Map<string, { kg: number; orm: number }>();
  for (const w of earlier) {
    for (const e of book.exercisesByWorkout.get(w.id) ?? []) {
      const key = exerciseKey(e.exercise_name);
      const p = priorBest.get(key) ?? { kg: 0, orm: 0 };
      for (const s of book.setsByExercise.get(e.id) ?? []) {
        p.kg = Math.max(p.kg, s.weight_kg ?? 0);
        p.orm = Math.max(p.orm, estimatedOneRepMax(s) ?? 0);
      }
      priorBest.set(key, p);
    }
  }
  let records = 0;
  for (const e of book.exercisesByWorkout.get(workoutId) ?? []) {
    const prior = priorBest.get(exerciseKey(e.exercise_name));
    // A first time isn't a record; it's a starting point.
    if (!prior) continue;
    const sets = book.setsByExercise.get(e.id) ?? [];
    const kg = Math.max(0, ...sets.map((s) => s.weight_kg ?? 0));
    const orm = Math.max(0, ...sets.map((s) => estimatedOneRepMax(s) ?? 0));
    if ((kg > 0 && kg > prior.kg) || (orm > 0 && orm > prior.orm)) records++;
  }
  return records;
}

export interface WorkoutCardData {
  workout: Workout;
  durationSeconds: number;
  volumeKg: number;
  records: number;
  /** "4 sets Deadlift", in order. */
  exercises: { name: string; sets: number }[];
}

/** What a workout card in a profile shows. */
export function workoutCard(book: Logbook, workout: Workout): WorkoutCardData {
  const sets = setsOf(book, workout.id);
  return {
    workout,
    durationSeconds: Math.max(
      0,
      Math.round((new Date(workout.finished_at ?? workout.started_at).getTime() - new Date(workout.started_at).getTime()) / 1000),
    ),
    volumeKg: sets.reduce((t, s) => t + (s.weight_kg ?? 0) * (s.reps ?? 0), 0),
    records: recordsSetIn(book, workout.id),
    exercises: (book.exercisesByWorkout.get(workout.id) ?? [])
      .map((e) => ({ name: e.exercise_name, sets: (book.setsByExercise.get(e.id) ?? []).length }))
      .filter((e) => e.sets > 0),
  };
}
