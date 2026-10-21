/**
 * The onboarding interview's answers: what a programme is built from.
 * Shared by the app (which asks the questions) and the `plan` edge function
 * (which turns the answers into a prompt). Dependency-free, see plan-schema.ts.
 */

export type Goal = 'jump' | 'strength' | 'muscle' | 'fitness' | 'comp';
export type Sport = 'basketball' | 'volleyball' | 'football' | 'other' | 'none';
export type Equipment = 'gym' | 'dumbbells' | 'bodyweight';
export type Experience = 'new' | 'some' | 'years';
export type Limitation = 'knee' | 'ankle' | 'shoulder' | 'back';
export type Sacrifice = 'late_nights' | 'sleep_ins' | 'weekends' | 'screens';

export interface TrainingBrief {
  goal: Goal;
  sport: Sport;
  /** Court or field sessions a week, 0–4. */
  courtDays: number;
  /** Lifting days a week, 2–6. */
  liftDays: number;
  /** Minutes per lifting session. */
  sessionMinutes: number;
  equipment: Equipment;
  experience: Experience;
  /** Joints to work around; empty means none. */
  limitations: Limitation[];
  /** What they've said they'll give up to make training happen. */
  sacrifices: Sacrifice[];
  /** Programme length in weeks, 2–8. For a comp goal, the comp is on the last weekend. */
  weeks: number;
}

const GOALS: readonly Goal[] = ['jump', 'strength', 'muscle', 'fitness', 'comp'];
const SPORTS: readonly Sport[] = ['basketball', 'volleyball', 'football', 'other', 'none'];
const EQUIPMENT: readonly Equipment[] = ['gym', 'dumbbells', 'bodyweight'];
const EXPERIENCE: readonly Experience[] = ['new', 'some', 'years'];
const LIMITATIONS: readonly Limitation[] = ['knee', 'ankle', 'shoulder', 'back'];
const SACRIFICES: readonly Sacrifice[] = ['late_nights', 'sleep_ins', 'weekends', 'screens'];

function oneOf<T extends string>(list: readonly T[], v: unknown): v is T {
  return typeof v === 'string' && (list as readonly string[]).includes(v);
}

function listOf<T extends string>(list: readonly T[], v: unknown): v is T[] {
  return Array.isArray(v) && v.every((x) => oneOf(list, x));
}

function intIn(v: unknown, lo: number, hi: number): v is number {
  return Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;
}

export function isBrief(v: unknown): v is TrainingBrief {
  if (typeof v !== 'object' || v === null) return false;
  const b = v as Record<string, unknown>;
  return (
    oneOf(GOALS, b.goal) &&
    oneOf(SPORTS, b.sport) &&
    intIn(b.courtDays, 0, 4) &&
    intIn(b.liftDays, 2, 6) &&
    intIn(b.sessionMinutes, 20, 120) &&
    oneOf(EQUIPMENT, b.equipment) &&
    oneOf(EXPERIENCE, b.experience) &&
    listOf(LIMITATIONS, b.limitations) &&
    listOf(SACRIFICES, b.sacrifices) &&
    intIn(b.weeks, 2, 8)
  );
}

const GOAL_TEXT: Record<Goal, string> = {
  jump: 'jump higher (vertical and approach jump)',
  strength: 'get stronger in the main lifts',
  muscle: 'build muscle',
  fitness: 'stay fit and consistent',
  comp: 'peak for a competition',
};
const SPORT_TEXT: Record<Sport, string> = {
  basketball: 'basketball',
  volleyball: 'volleyball',
  football: 'football',
  other: 'another court or field sport',
  none: 'no sport, lifting only',
};
const EQUIPMENT_TEXT: Record<Equipment, string> = {
  gym: 'a full gym (barbells, racks, machines, cables, dumbbells)',
  dumbbells: 'dumbbells and a bench at home, no barbell or machines',
  bodyweight: 'bodyweight only, no equipment',
};
const EXPERIENCE_TEXT: Record<Experience, string> = {
  new: 'new to lifting (under a year)',
  some: 'a year or two of lifting',
  years: 'several years of lifting',
};
const LIMITATION_TEXT: Record<Limitation, string> = {
  knee: 'a knee to look after',
  ankle: 'an ankle to look after',
  shoulder: 'a shoulder to look after',
  back: 'a lower back to look after',
};
const SACRIFICE_TEXT: Record<Sacrifice, string> = {
  late_nights: 'late nights',
  sleep_ins: 'sleeping in',
  weekends: 'free weekends',
  screens: 'screen time',
};

function list(items: string[]): string {
  return items.length === 0 ? 'nothing in particular' : items.join(', ');
}

/** The brief as the model reads it: one line per answer. */
export function briefToProse(b: TrainingBrief): string {
  return [
    `Goal: ${GOAL_TEXT[b.goal]}${b.goal === 'comp' ? ` in ${b.weeks} weeks, on the final weekend of the programme` : ''}.`,
    `Sport: ${SPORT_TEXT[b.sport]}${b.sport !== 'none' ? `, ${b.courtDays} court/field session${b.courtDays === 1 ? '' : 's'} a week` : ''}.`,
    `Lifting days available: ${b.liftDays} a week, about ${b.sessionMinutes} minutes each.`,
    `Equipment: ${EQUIPMENT_TEXT[b.equipment]}.`,
    `Experience: ${EXPERIENCE_TEXT[b.experience]}.`,
    `Working around: ${list(b.limitations.map((l) => LIMITATION_TEXT[l]))}.`,
    `Willing to give up for it: ${list(b.sacrifices.map((s) => SACRIFICE_TEXT[s]))}.`,
    `Programme length: ${b.weeks} weeks.`,
  ].join('\n');
}
