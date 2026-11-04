import { DEFAULT_WEEKS, briefToDraft, completeBrief, defaultDraft, isAnswered, noteFor, titleFor, visibleQuestions } from '../questions';

describe('onboarding questions', () => {
  it('skips the court-days question for someone with no sport', () => {
    const keys = visibleQuestions({ sport: 'none' }).map((q) => q.key);
    expect(keys).not.toContain('courtDays');
    expect(visibleQuestions({ sport: 'basketball' }).map((q) => q.key)).toContain('courtDays');
  });

  it('skips the season for a comp goal, and personalises headings with a name', () => {
    expect(visibleQuestions({ goal: 'comp' }).map((q) => q.key)).not.toContain('season');
    expect(visibleQuestions({ goal: 'jump' }).map((q) => q.key)).toContain('season');
    const goal = visibleQuestions({})[0];
    expect(titleFor(goal, { name: 'Sam' })).toBe('What are you training for, Sam?');
    expect(titleFor(goal, {})).toBe('What are you training for?');
  });

  it('asks weeks-to-comp instead of block length for a comp goal', () => {
    const last = visibleQuestions({ goal: 'comp' }).at(-1)!;
    expect(last.key).toBe('weeks');
    expect(last.title).toMatch(/comp/);
    expect(visibleQuestions({ goal: 'jump' }).at(-1)!.title).not.toMatch(/comp/);
  });

  it('counts an untouched multi-select as unanswered, and "none" as answered', () => {
    const limitations = visibleQuestions({}).find((q) => q.key === 'limitations')!;
    expect(isAnswered(limitations, {})).toBe(false);
    expect(isAnswered(limitations, { limitations: [] })).toBe(true);
  });

  it('builds a brief only once every visible question is answered', () => {
    const partial = { goal: 'jump' as const, sport: 'none' as const, season: 'off' as const, liftDays: 3, minimumMinutes: 15, obstacles: [] };
    expect(completeBrief(partial)).toBeNull();
    const brief = completeBrief({
      ...partial,
      sessionMinutes: 45,
      equipment: ['barbell', 'rack', 'bench', 'dumbbells'],
      experience: 'some',
      limitations: ['knee'],
      sacrifices: [],
      weeks: 6,
    });
    expect(brief).toEqual({
      goal: 'jump',
      sport: 'none',
      courtDays: 0,
      season: 'off',
      liftDays: 3,
      sessionMinutes: 45,
      minimumMinutes: 15,
      obstacles: [],
      equipment: ['barbell', 'rack', 'bench', 'dumbbells'],
      experience: 'some',
      limitations: ['knee'],
      sacrifices: [],
      weeks: 6,
      notes: {},
    });
  });

  it('takes a written answer in place of a card, and sends null for the card', () => {
    const draft = {
      goal: 'jump' as const,
      sport: 'none' as const,
      season: 'in' as const,
      liftDays: 3,
      minimumMinutes: 10,
      obstacles: ['no_time' as const],
      sessionMinutes: 45,
      experience: 'some' as const,
      limitations: [],
      sacrifices: [],
      weeks: 6,
      notes: { equipment: 'a squat rack in the garage, no cables' },
    };
    const equipment = visibleQuestions(draft).find((q) => q.key === 'equipment')!;
    expect(noteFor(draft, 'equipment')).toBe('a squat rack in the garage, no cables');
    expect(isAnswered(equipment, draft)).toBe(true);
    expect(completeBrief(draft)).toMatchObject({ equipment: null, notes: { equipment: 'a squat rack in the garage, no cables' } });
  });
});

describe('defaults and rebuilding', () => {
  it('starts every question answered, so the interview can be tapped through', () => {
    const draft = defaultDraft();
    for (const q of visibleQuestions(draft)) expect(isAnswered(q, draft)).toBe(true);
    expect(completeBrief(draft)).not.toBeNull();
  });

  it('only asks about length as a comp countdown; other blocks default', () => {
    expect(visibleQuestions({ goal: 'strength' }).map((q) => q.key)).not.toContain('weeks');
    expect(completeBrief({ ...defaultDraft(), goal: 'strength' })?.weeks).toBe(DEFAULT_WEEKS);
    expect(completeBrief({ ...defaultDraft(), goal: 'comp', weeks: 3 })?.weeks).toBe(3);
  });

  it('names the sport in the sessions question so it reads apart from lifting days', () => {
    const q = visibleQuestions({ sport: 'netball' }).find((x) => x.key === 'courtDays')!;
    expect(titleFor(q, { sport: 'netball' })).toBe('How many netball sessions a week?');
    expect(titleFor(q, { sport: 'other' })).toBe('How many court or field sessions a week?');
  });

  it('reads an older single-choice equipment answer back as the kit it meant', () => {
    const draft = briefToDraft({ ...completeBrief(defaultDraft())!, equipment: 'dumbbells', notes: { goal: 'run faster' } });
    expect(draft.equipment).toEqual(['dumbbells', 'bench']);
    // A written answer stays written: the card value is cleared, not defaulted.
    expect(draft.goal).toBeUndefined();
    expect(draft.notes?.goal).toBe('run faster');
  });
});
