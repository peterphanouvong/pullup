/**
 * The onboarding interview's answers: what a programme is built from.
 * Shared by the app (which asks the questions) and the `plan` edge function
 * (which turns the answers into a prompt). Dependency-free, see plan-schema.ts.
 */

export type Goal = 'jump' | 'strength' | 'muscle' | 'fitness' | 'comp';
export type Sport = 'volleyball' | 'basketball' | 'netball' | 'football' | 'other' | 'none';
export type Equipment = 'gym' | 'dumbbells' | 'bodyweight';
export type Experience = 'new' | 'some' | 'years';
export type Limitation = 'knee' | 'ankle' | 'shoulder' | 'back';
export type Sacrifice = 'late_nights' | 'sleep_ins' | 'weekends' | 'screens';
export type Season = 'pre' | 'in' | 'off' | 'none';
export type Obstacle = 'dont_know' | 'no_time' | 'drop_off' | 'alone' | 'tired';

/**
 * Every question can be answered from the cards or in the athlete's own
 * words. A written answer lives in `notes` under the question's key and
 * the card value for that question is null; the coach reads the words.
 */
export interface TrainingBrief {
  goal: Goal | null;
  sport: Sport | null;
  /** Court or field sessions a week, 0–4. */
  courtDays: number | null;
  /** Lifting days a week, 2–6. */
  liftDays: number | null;
  /** Minutes per lifting session. */
  sessionMinutes: number | null;
  equipment: Equipment | null;
  experience: Experience | null;
  /** Joints to work around; empty means none. */
  limitations: Limitation[] | null;
  /** Where they are in their season. Null for a comp goal, where the
   * season is "building to the comp". */
  season: Season | null;
  /** What usually stops them training. */
  obstacles: Obstacle[] | null;
  /** What they've said they'll give up to make training happen. */
  sacrifices: Sacrifice[] | null;
  /** The minimum viable workout: minutes they could still manage on a flat
   * day. Every lifting day gets a short version this long. */
  minimumMinutes: number | null;
  /** Programme length in weeks, 2–8. For a comp goal, the comp is on the last weekend. */
  weeks: number | null;
  /** Answers in their own words, by question. */
  notes: Partial<Record<BriefKey, string>>;
}

export type BriefKey = Exclude<keyof TrainingBrief, 'notes'>;

export const BRIEF_KEYS: readonly BriefKey[] = [
  'goal', 'sport', 'courtDays', 'season', 'liftDays', 'sessionMinutes', 'minimumMinutes', 'equipment', 'experience',
  'limitations', 'obstacles', 'sacrifices', 'weeks',
];

/** Longest written answer we keep. */
export const BRIEF_NOTE_MAX = 200;

const GOALS: readonly Goal[] = ['jump', 'strength', 'muscle', 'fitness', 'comp'];
const SPORTS: readonly Sport[] = ['volleyball', 'basketball', 'netball', 'football', 'other', 'none'];
const EQUIPMENT: readonly Equipment[] = ['gym', 'dumbbells', 'bodyweight'];
const EXPERIENCE: readonly Experience[] = ['new', 'some', 'years'];
const LIMITATIONS: readonly Limitation[] = ['knee', 'ankle', 'shoulder', 'back'];
const SACRIFICES: readonly Sacrifice[] = ['late_nights', 'sleep_ins', 'weekends', 'screens'];
const SEASONS: readonly Season[] = ['pre', 'in', 'off', 'none'];
const OBSTACLES: readonly Obstacle[] = ['dont_know', 'no_time', 'drop_off', 'alone', 'tired'];

function oneOf<T extends string>(list: readonly T[], v: unknown): v is T {
  return typeof v === 'string' && (list as readonly string[]).includes(v);
}

function listOf<T extends string>(list: readonly T[], v: unknown): v is T[] {
  return Array.isArray(v) && v.every((x) => oneOf(list, x));
}

function intIn(v: unknown, lo: number, hi: number): v is number {
  return Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;
}

function isNotes(v: unknown): v is Partial<Record<BriefKey, string>> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  return Object.entries(v).every(
    ([k, text]) => (BRIEF_KEYS as readonly string[]).includes(k) && typeof text === 'string' && text.trim().length > 0 && text.length <= BRIEF_NOTE_MAX,
  );
}

/** A question is answered by a valid card value, or by a written note with
 * the card value null. Court days may also be null when there's no sport. */
export function isBrief(v: unknown): v is TrainingBrief {
  if (typeof v !== 'object' || v === null) return false;
  const b = v as Record<string, unknown>;
  if (!isNotes(b.notes)) return false;
  const notes = b.notes;
  const answered = (key: BriefKey, valid: boolean) => valid || (b[key] === null && typeof notes[key] === 'string');
  return (
    answered('goal', oneOf(GOALS, b.goal)) &&
    answered('sport', oneOf(SPORTS, b.sport)) &&
    (answered('courtDays', intIn(b.courtDays, 0, 4)) || (b.courtDays === null && b.sport === 'none')) &&
    (answered('season', oneOf(SEASONS, b.season)) || (b.season === null && b.goal === 'comp')) &&
    answered('liftDays', intIn(b.liftDays, 2, 6)) &&
    answered('minimumMinutes', intIn(b.minimumMinutes, 5, 30)) &&
    answered('obstacles', listOf(OBSTACLES, b.obstacles)) &&
    answered('sessionMinutes', intIn(b.sessionMinutes, 20, 120)) &&
    answered('equipment', oneOf(EQUIPMENT, b.equipment)) &&
    answered('experience', oneOf(EXPERIENCE, b.experience)) &&
    answered('limitations', listOf(LIMITATIONS, b.limitations)) &&
    answered('sacrifices', listOf(SACRIFICES, b.sacrifices)) &&
    answered('weeks', intIn(b.weeks, 2, 8))
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
  netball: 'netball',
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
const SEASON_TEXT: Record<Season, string> = {
  pre: 'pre-season: building toward the season starting',
  in: 'in season: games and court load most weeks, so the gym supports rather than competes',
  off: 'off-season: the window to build strength and power',
  none: 'no season, training all year round',
};
const OBSTACLE_TEXT: Record<Obstacle, string> = {
  dont_know: 'not knowing what to do in the gym',
  no_time: 'not having time',
  drop_off: 'starting strong then dropping off',
  alone: 'having nobody to train with',
  tired: 'being too tired after court or school',
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

/** The brief as the model reads it: one line per answer. A written answer
 * is quoted as given, so the coach works from the athlete's words. */
export function briefToProse(b: TrainingBrief): string {
  const own = (key: BriefKey, label: string, canned: () => string) => {
    const note = b.notes[key]?.trim();
    return note ? `${label}, in their own words: "${note}"` : canned();
  };
  const weeksText = b.weeks != null ? `${b.weeks} weeks` : 'as they describe';
  return [
    own('goal', 'Goal', () =>
      `Goal: ${GOAL_TEXT[b.goal!]}${b.goal === 'comp' ? `, competing in ${weeksText}, on the final weekend of the programme` : ''}.`),
    own('sport', 'Sport', () => `Sport: ${SPORT_TEXT[b.sport!]}.`),
    own('courtDays', 'Court/field sessions a week', () =>
      b.sport === 'none' || b.courtDays == null
        ? 'Court/field sessions a week: none.'
        : `Court/field sessions a week: ${b.courtDays}.`),
    own('season', 'Season', () =>
      b.season == null ? 'Season: building to the competition.' : `Season: ${SEASON_TEXT[b.season]}.`),
    own('liftDays', 'Lifting days a week', () => `Lifting days available: ${b.liftDays} a week.`),
    own('sessionMinutes', 'Session length', () => `Session length: about ${b.sessionMinutes} minutes.`),
    own('minimumMinutes', 'On a flat day they could still do', () =>
      `On a flat day they could still do: about ${b.minimumMinutes} minutes.`),
    own('equipment', 'Equipment', () => `Equipment: ${EQUIPMENT_TEXT[b.equipment!]}.`),
    own('experience', 'Experience', () => `Experience: ${EXPERIENCE_TEXT[b.experience!]}.`),
    own('limitations', 'Working around', () => `Working around: ${list((b.limitations ?? []).map((l) => LIMITATION_TEXT[l]))}.`),
    own('obstacles', 'What usually stops them', () =>
      `What usually stops them: ${list((b.obstacles ?? []).map((o) => OBSTACLE_TEXT[o]))}.`),
    own('sacrifices', 'Willing to give up for it', () =>
      `Willing to give up for it: ${list((b.sacrifices ?? []).map((s) => SACRIFICE_TEXT[s]))}.`),
    own('weeks', 'Programme length', () => `Programme length: ${weeksText}.`),
  ].join('\n');
}
