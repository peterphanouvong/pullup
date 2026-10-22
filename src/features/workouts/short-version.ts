import type { DayExercise, ProgramDay } from '@/features/programs/types';

/**
 * The minimum viable workout: a flat-day cut of a programme day that still
 * counts. Starting it logs against the same day, so the week and the crew
 * see a session done, which is the point: keep the habit alive.
 *
 * Where it comes from, in order:
 * 1. The coach's line in the day's notes, the shape the `plan` function
 *    asks for: "Short on time (15 min): Back Squat 2x5, Pull-Up 2x6".
 *    Names are matched to the day's own exercises (loosely, either way
 *    round); sets and reps come from the line when given.
 * 2. Otherwise the day's first exercises, which are the main lifts in how
 *    programs are written, at two sets each.
 *
 * Pure: no store, so it's tested on its own.
 */

export interface ShortVersion {
  /** Minutes the short version is meant to take. */
  minutes: number;
  /** The day, cut down: only the chosen exercises, with their reduced sets. */
  day: ProgramDay;
}

const DEFAULT_MINUTES = 15;
const FALLBACK_EXERCISES = 3;
const FALLBACK_SETS = 2;

const LINE_RE = /short on time\s*(?:\((\d+)\s*min[^)]*\))?\s*:\s*(.+)/i;
// "Back Squat 2x5", "Plank 2 × 30 s", "Pull-Up 2x6-8"
const ITEM_RE = /^(.*?)\s+(\d+)\s*[x×]\s*(.+)$/i;

function normalise(name: string): string {
  return name.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function matches(written: string, exercise: DayExercise): boolean {
  const a = normalise(written);
  const b = normalise(exercise.exerciseName);
  return a.length > 0 && b.length > 0 && (a.includes(b) || b.includes(a));
}

function fromNotes(day: ProgramDay): ShortVersion | null {
  const line = (day.notes ?? '').split('\n').map((l) => l.trim()).find((l) => LINE_RE.test(l));
  if (!line) return null;
  const [, minutesText, listText] = line.match(LINE_RE)!;
  const chosen: DayExercise[] = [];
  for (const raw of listText.split(/[,;]/)) {
    const item = raw.trim().replace(/[.]$/, '');
    if (!item) continue;
    const parsed = item.match(ITEM_RE);
    const name = parsed ? parsed[1] : item;
    const exercise = day.exercises.find((e) => matches(name, e) && !chosen.some((c) => c.id === e.id));
    if (!exercise) continue;
    chosen.push({
      ...exercise,
      sets: parsed ? Number(parsed[2]) : Math.min(exercise.sets ?? FALLBACK_SETS, FALLBACK_SETS),
      reps: parsed ? parsed[3].trim() : exercise.reps,
    });
  }
  if (chosen.length === 0) return null;
  return {
    minutes: minutesText ? Number(minutesText) : DEFAULT_MINUTES,
    day: { ...day, exercises: chosen.map((e, i) => ({ ...e, position: i + 1 })) },
  };
}

/** The flat-day version of a lifting day, or null when there's nothing to
 * cut (no exercises). */
export function shortVersionOf(day: ProgramDay): ShortVersion | null {
  if (day.exercises.length === 0) return null;
  const coached = fromNotes(day);
  if (coached) return coached;
  const exercises = [...day.exercises]
    .sort((a, b) => a.position - b.position)
    .slice(0, FALLBACK_EXERCISES)
    .map((e, i) => ({ ...e, position: i + 1, sets: Math.min(e.sets ?? FALLBACK_SETS, FALLBACK_SETS) }));
  return { minutes: DEFAULT_MINUTES, day: { ...day, exercises } };
}

/** The short version's workout title, which is also how a live workout
 * knows which version it's on: "Lower A · 15 min". */
export function shortTitle(day: ProgramDay, short: ShortVersion): string {
  return `${day.name} · ${short.minutes} min`;
}
