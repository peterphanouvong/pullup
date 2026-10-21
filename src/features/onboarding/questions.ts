import type { TrainingBrief } from './brief';

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
  key: keyof TrainingBrief;
  title: string;
  subtitle: string;
  kind: 'single' | 'multi';
  options: Option[];
  /** For a multi-select: the card that means "none of these" and clears the rest. */
  noneLabel?: string;
}

export type Draft = Partial<TrainingBrief>;

const WHY = 'This shapes the programme we write for you.';

const GOAL: Question = {
  key: 'goal',
  title: 'What are you training for?',
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
    { value: 'basketball', label: 'Basketball' },
    { value: 'volleyball', label: 'Volleyball' },
    { value: 'football', label: 'Football' },
    { value: 'other', label: 'Something else' },
    { value: 'none', label: 'No sport', caption: 'Lifting is the training' },
  ],
};

const COURT_DAYS: Question = {
  key: 'courtDays',
  title: 'How many sessions a week?',
  subtitle: 'Court or field, training or games. We keep those days clear.',
  kind: 'single',
  options: [
    { value: 1, label: '1 a week' },
    { value: 2, label: '2 a week' },
    { value: 3, label: '3 a week' },
    { value: 4, label: '4 or more' },
  ],
};

const LIFT_DAYS: Question = {
  key: 'liftDays',
  title: 'How many days can you lift?',
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

const EQUIPMENT: Question = {
  key: 'equipment',
  title: 'Where do you train?',
  subtitle: WHY,
  kind: 'single',
  options: [
    { value: 'gym', label: 'A gym', caption: 'Barbells, racks, machines' },
    { value: 'dumbbells', label: 'At home with dumbbells', caption: 'Dumbbells and a bench' },
    { value: 'bodyweight', label: 'No equipment', caption: 'Bodyweight only' },
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

const WEEKS: Question = {
  key: 'weeks',
  title: 'How long a block?',
  subtitle: 'You can rework it or start another any time.',
  kind: 'single',
  options: [
    { value: 4, label: '4 weeks', caption: 'A quick block' },
    { value: 6, label: '6 weeks' },
    { value: 8, label: '8 weeks', caption: 'A full build' },
  ],
};

const WEEKS_TO_COMP: Question = {
  key: 'weeks',
  title: 'How far away is the comp?',
  subtitle: 'The programme ends on that weekend, tapered and ready.',
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
 * nothing to ask about, and a comp goal counts weeks to the comp. */
export function visibleQuestions(draft: Draft): Question[] {
  return [
    GOAL,
    SPORT,
    ...(draft.sport === 'none' ? [] : [COURT_DAYS]),
    LIFT_DAYS,
    SESSION_MINUTES,
    EQUIPMENT,
    EXPERIENCE,
    LIMITATIONS,
    SACRIFICES,
    draft.goal === 'comp' ? WEEKS_TO_COMP : WEEKS,
  ];
}

/** Whether a question has an answer. A multi-select counts as answered
 * once it has been touched, including "none", which stores []. */
export function isAnswered(question: Question, draft: Draft): boolean {
  const value = draft[question.key];
  return question.kind === 'multi' ? Array.isArray(value) : value != null;
}

/** The brief, if every visible question is answered; null otherwise. */
export function completeBrief(draft: Draft): TrainingBrief | null {
  const questions = visibleQuestions(draft);
  if (!questions.every((q) => isAnswered(q, draft))) return null;
  return {
    goal: draft.goal!,
    sport: draft.sport!,
    courtDays: draft.sport === 'none' ? 0 : draft.courtDays!,
    liftDays: draft.liftDays!,
    sessionMinutes: draft.sessionMinutes!,
    equipment: draft.equipment!,
    experience: draft.experience!,
    limitations: draft.limitations ?? [],
    sacrifices: draft.sacrifices ?? [],
    weeks: draft.weeks!,
  };
}
