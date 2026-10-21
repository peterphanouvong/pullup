import { completeBrief, isAnswered, noteFor, visibleQuestions } from '../questions';

describe('onboarding questions', () => {
  it('skips the court-days question for someone with no sport', () => {
    const keys = visibleQuestions({ sport: 'none' }).map((q) => q.key);
    expect(keys).not.toContain('courtDays');
    expect(visibleQuestions({ sport: 'basketball' }).map((q) => q.key)).toContain('courtDays');
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
    const partial = { goal: 'jump', sport: 'none', liftDays: 3 } as const;
    expect(completeBrief(partial)).toBeNull();
    const brief = completeBrief({
      ...partial,
      sessionMinutes: 45,
      equipment: 'gym',
      experience: 'some',
      limitations: ['knee'],
      sacrifices: [],
      weeks: 6,
    });
    expect(brief).toEqual({
      goal: 'jump',
      sport: 'none',
      courtDays: 0,
      liftDays: 3,
      sessionMinutes: 45,
      equipment: 'gym',
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
      liftDays: 3,
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
