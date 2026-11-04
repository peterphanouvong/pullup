import { EQUIPMENT, normaliseBrief, type BriefKey, type TrainingBrief } from './brief';

/**
 * The interview, one question per screen, Cal AI style: a heading, a line
 * on why we ask, big tappable cards, Continue. Answers land in a partial
 * brief; `completeBrief` turns it into the brief the coach reads.
 */

export interface Option {
  value: string | number;
  label: string;
  caption?: string;
}

export interface Question {
  key: BriefKey;
  title: string;
  /** The title with their name worked in, when we have one. */
  named?: (name: string) => string;
  /** The title reworded from earlier answers (the sport, say). Wins over
   * `named` and `title` when it returns one. */
  titled?: (draft: Draft) => string | null;
  subtitle: string;
  kind: 'single' | 'multi';
  options: Option[];
  /** For a multi-select: the card that means "none of these" and clears the rest. */
  noneLabel?: string;
}

/** Answers so far. Card values by key, plus `notes` for the ones written
 * out instead; a key has one or the other. */
export type Draft = Partial<Omit<TrainingBrief, 'notes'>> & {
  notes?: TrainingBrief['notes'];
  /** First name, for headings and the crew. Never sent to the coach. */
  name?: string;
};

/** The heading for a question, personalised when there's a name. */
export function titleFor(question: Question, draft: Draft): string {
  const reworded = question.titled?.(draft);
  if (reworded) return reworded;
  const name = draft.name?.trim();
  return name && question.named ? question.named(name) : question.title;
}

/** Where every answer starts. Each card comes pre-chosen so the interview
 * can be tapped straight through, and only the answers that matter to
 * someone get changed. A full gym, three days of 45 minutes, no sport. */
export const DEFAULT_DRAFT: Draft = {
  goal: 'strength',
  sport: 'none',
  courtDays: 2,
  season: 'none',
  liftDays: 3,
  sessionMinutes: 45,
  minimumMinutes: 15,
  equipment: [...EQUIPMENT],
  experience: 'some',
  limitations: [],
  obstacles: [],
  sacrifices: [],
  weeks: 4,
  notes: {},
};

/** A fresh copy of the defaults: the lists are new arrays, so answering
 * one interview can't leak into the next. */
export function defaultDraft(): Draft {
  return {
    ...DEFAULT_DRAFT,
    equipment: [...(DEFAULT_DRAFT.equipment ?? [])],
    limitations: [],
    obstacles: [],
    sacrifices: [],
    notes: {},
  };
}

/** How long a block runs when it isn't a comp countdown. Not asked: most
 * people have no view on it, and a rework can change it. */
export const DEFAULT_WEEKS = 6;

/** The answers a built programme was written from, back into a draft,
 * for changing a few and building again. Written-in answers come back as
 * written. Anything unreadable falls back to the defaults. */
export function briefToDraft(stored: unknown): Draft {
  const brief = normaliseBrief(stored);
  if (typeof brief !== 'object' || brief === null) return defaultDraft();
  const b = brief as Partial<TrainingBrief>;
  const notes = { ...(b.notes ?? {}) };
  const draft: Draft = { ...defaultDraft(), notes };
  const keys: BriefKey[] = [
    'goal', 'sport', 'courtDays', 'season', 'liftDays', 'sessionMinutes', 'minimumMinutes', 'equipment', 'experience',
    'limitations', 'obstacles', 'sacrifices', 'weeks',
  ];
  for (const key of keys) {
    const value = b[key];
    // A written answer means the card value is null; the default would
    // otherwise sneak back in beside the words.
    if (notes[key] != null) (draft as Record<string, unknown>)[key] = undefined;
    else if (value != null) (draft as Record<string, unknown>)[key] = value;
  }
  return draft;
}

/** The written answer for a question, if that's how it was answered. */
export function noteFor(draft: Draft, key: BriefKey): string | null {
  const note = draft.notes?.[key]?.trim();
  return note ? note : null;
}

const WHY = 'This shapes the program we write for you.';

const GOAL: Question = {
  key: 'goal',
  title: 'What are you training for?',
  named: (name) => `What are you training for, ${name}?`,
  subtitle: WHY,
  kind: 'single',
  options: [
    { value: 'jump', label: 'Jump higher', caption: 'Vertical and approach jump' },
    { value: 'strength', label: 'Get stronger', caption: 'The big lifts, heavier' },
    { value: 'muscle', label: 'Build muscle', caption: 'Size and shape' },
    { value: 'fitness', label: 'Stay in shape', caption: 'Consistent, feel good' },
    { value: 'comp', label: 'Peak for a comp', caption: 'A tournament or event' },
  ],
};

const SPORT: Question = {
  key: 'sport',
  title: 'Do you play a sport?',
  subtitle: 'Court and field sessions count as training. We lift around them.',
  kind: 'single',
  options: [
    { value: 'volleyball', label: 'Volleyball' },
    { value: 'basketball', label: 'Basketball' },
    { value: 'netball', label: 'Netball' },
    { value: 'football', label: 'Football' },
    { value: 'other', label: 'Another sport', caption: 'Court or field' },
    { value: 'none', label: 'No sport', caption: 'Lifting is the training' },
  ],
};

const SPORT_WORD: Record<string, string> = {
  volleyball: 'volleyball',
  basketball: 'basketball',
  netball: 'netball',
  football: 'football',
};

const COURT_DAYS: Question = {
  key: 'courtDays',
  title: 'How many court or field sessions a week?',
  titled: (draft) => {
    const word = draft.sport != null ? SPORT_WORD[String(draft.sport)] : undefined;
    return word ? `How many ${word} sessions a week?` : null;
  },
  subtitle: 'Training or games. We keep those days clear of heavy lifting.',
  kind: 'single',
  options: [
    { value: 1, label: '1 a week' },
    { value: 2, label: '2 a week' },
    { value: 3, label: '3 a week' },
    { value: 4, label: '4 or more' },
  ],
};

const SEASON: Question = {
  key: 'season',
  title: 'Where are you at in your season?',
  subtitle: 'In season the gym backs up your games. Out of it, it’s where you build.',
  kind: 'single',
  options: [
    { value: 'pre', label: 'Pre-season', caption: 'The season’s coming' },
    { value: 'in', label: 'In season', caption: 'Games most weeks' },
    { value: 'off', label: 'Off-season', caption: 'Time to build' },
    { value: 'none', label: 'No season', caption: 'I train all year' },
  ],
};

const MINIMUM: Question = {
  key: 'minimumMinutes',
  title: 'On a flat day, how short could a session be?',
  subtitle: 'Every workout gets a cut-down version this long. Doing just that still counts for the week.',
  kind: 'single',
  options: [
    { value: 10, label: '10 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 20, label: '20 minutes' },
  ],
};

const OBSTACLES: Question = {
  key: 'obstacles',
  title: 'What usually gets in the way?',
  named: (name) => `What usually gets in the way, ${name}?`,
  subtitle: 'Be honest. We’ll build around it.',
  kind: 'multi',
  noneLabel: 'Nothing yet, I’m just starting',
  options: [
    { value: 'dont_know', label: 'Not sure what to do' },
    { value: 'no_time', label: 'No time' },
    { value: 'drop_off', label: 'I start strong, then drop off' },
    { value: 'alone', label: 'Nobody to train with' },
    { value: 'tired', label: 'Too tired after court' },
  ],
};

const LIFT_DAYS: Question = {
  key: 'liftDays',
  title: 'How many days can you lift?',
  named: (name) => `How many days can you lift, ${name}?`,
  subtitle: 'Be honest. A plan you can keep beats a plan you can’t.',
  kind: 'single',
  options: [
    { value: 2, label: '2 days' },
    { value: 3, label: '3 days' },
    { value: 4, label: '4 days' },
    { value: 5, label: '5 days' },
    { value: 6, label: '6 days' },
  ],
};

const SESSION_MINUTES: Question = {
  key: 'sessionMinutes',
  title: 'How long per session?',
  subtitle: 'Door to door, not counting the drive.',
  kind: 'single',
  options: [
    { value: 30, label: '30 minutes', caption: 'In and out' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '60 minutes' },
    { value: 75, label: '75 minutes or more' },
  ],
};

const EQUIPMENT_Q: Question = {
  key: 'equipment',
  title: 'What do you have to train with?',
  subtitle: 'Everything you can get to. A gym membership is all of these.',
  kind: 'multi',
  noneLabel: 'Just my bodyweight',
  options: [
    { value: 'barbell', label: 'Barbell' },
    { value: 'rack', label: 'Squat rack' },
    { value: 'bench', label: 'Bench' },
    { value: 'dumbbells', label: 'Dumbbells' },
    { value: 'cables', label: 'Cables' },
    { value: 'machines', label: 'Machines' },
    { value: 'pullup_bar', label: 'Pull-up bar' },
    { value: 'dip_bars', label: 'Dip bars' },
    { value: 'kettlebells', label: 'Kettlebells' },
    { value: 'bands', label: 'Bands' },
    { value: 'trap_bar', label: 'Trap bar' },
    { value: 'plyo_box', label: 'Plyo box' },
    { value: 'medicine_ball', label: 'Medicine ball' },
    { value: 'suspension', label: 'TRX / rings' },
    { value: 'jump_rope', label: 'Jump rope' },
    { value: 'cardio', label: 'Bike / rower' },
  ],
};

const EXPERIENCE: Question = {
  key: 'experience',
  title: 'How long have you been lifting?',
  subtitle: WHY,
  kind: 'single',
  options: [
    { value: 'new', label: 'I’m new', caption: 'Under a year' },
    { value: 'some', label: 'A year or two' },
    { value: 'years', label: 'Years' },
  ],
};

const LIMITATIONS: Question = {
  key: 'limitations',
  title: 'Anything to work around?',
  subtitle: 'We’ll pick variations that are kind to it and still train it.',
  kind: 'multi',
  noneLabel: 'Nothing, I’m good',
  options: [
    { value: 'knee', label: 'A knee' },
    { value: 'ankle', label: 'An ankle' },
    { value: 'shoulder', label: 'A shoulder' },
    { value: 'back', label: 'My lower back' },
  ],
};

const SACRIFICES: Question = {
  key: 'sacrifices',
  title: 'What will you give up for it?',
  named: (name) => `What will you give up for it, ${name}?`,
  subtitle: 'Sessions need a slot. Where does yours come from?',
  kind: 'multi',
  noneLabel: 'Nothing, I’ve got the time',
  options: [
    { value: 'late_nights', label: 'Late nights' },
    { value: 'sleep_ins', label: 'Sleeping in' },
    { value: 'weekends', label: 'Free weekends' },
    { value: 'screens', label: 'Screen time' },
  ],
};

const WEEKS_TO_COMP: Question = {
  key: 'weeks',
  title: 'How far away is the comp?',
  subtitle: 'The program ends on that weekend, tapered and ready.',
  kind: 'single',
  options: [
    { value: 2, label: '2 weeks' },
    { value: 3, label: '3 weeks' },
    { value: 4, label: '4 weeks' },
    { value: 6, label: '6 weeks' },
    { value: 8, label: '8 weeks' },
  ],
};

/** The questions this draft gets, in order: a sport with no sessions has
 * nothing to ask about, and only a comp goal asks about length (as weeks
 * to the comp); every other block is `DEFAULT_WEEKS` long. */
export function visibleQuestions(draft: Draft): Question[] {
  return [
    GOAL,
    SPORT,
    ...(draft.sport === 'none' ? [] : [COURT_DAYS]),
    // A comp goal already says where the season is: building to it.
    ...(draft.goal === 'comp' ? [] : [SEASON]),
    LIFT_DAYS,
    SESSION_MINUTES,
    MINIMUM,
    EQUIPMENT_Q,
    EXPERIENCE,
    LIMITATIONS,
    OBSTACLES,
    SACRIFICES,
    ...(draft.goal === 'comp' ? [WEEKS_TO_COMP] : []),
  ];
}

/** Whether a question has an answer: a card, or a written note. A
 * multi-select counts as answered once touched, including "none" ([]). */
export function isAnswered(question: Question, draft: Draft): boolean {
  if (noteFor(draft, question.key) != null) return true;
  const value = draft[question.key];
  return question.kind === 'multi' ? Array.isArray(value) : value != null;
}

/** The brief, if every visible question is answered; null otherwise.
 * A question answered in writing sends null for its card value. */
export function completeBrief(draft: Draft): TrainingBrief | null {
  const questions = visibleQuestions(draft);
  if (!questions.every((q) => isAnswered(q, draft))) return null;
  const notes: TrainingBrief['notes'] = {};
  for (const q of questions) {
    const note = noteFor(draft, q.key);
    if (note != null) notes[q.key] = note;
  }
  const card = <K extends BriefKey>(key: K): TrainingBrief[K] =>
    (notes[key] != null ? null : (draft[key] ?? null)) as TrainingBrief[K];
  return {
    goal: card('goal'),
    sport: card('sport'),
    courtDays: draft.sport === 'none' ? 0 : card('courtDays'),
    season: draft.goal === 'comp' ? null : card('season'),
    liftDays: card('liftDays'),
    sessionMinutes: card('sessionMinutes'),
    minimumMinutes: card('minimumMinutes'),
    obstacles: notes.obstacles != null ? null : (draft.obstacles ?? []),
    equipment: notes.equipment != null ? null : (draft.equipment ?? []),
    experience: card('experience'),
    limitations: notes.limitations != null ? null : (draft.limitations ?? []),
    sacrifices: notes.sacrifices != null ? null : (draft.sacrifices ?? []),
    weeks: draft.goal === 'comp' ? card('weeks') : DEFAULT_WEEKS,
    notes,
  };
}
