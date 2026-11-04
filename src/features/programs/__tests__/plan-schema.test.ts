import { PLAN_DAYS_PER_WEEK, validatePlan, type ProgramPlan } from '../plan';
import { briefToProse, isBrief, type Equipment } from '@/features/onboarding/brief';

const day = (i: number) => ({ name: `Day ${i}`, kind: 'rest' as const, notes: null, exercises: [] });
const lifting = {
  name: 'Mon — Lower',
  kind: 'lifting' as const,
  notes: null,
  exercises: [{ exercise_name: 'Back Squat', sets: 4, reps: '5', load: 'RPE 7', notes: null }],
};

function plan(overrides: Partial<ProgramPlan> = {}): ProgramPlan {
  return {
    name: 'Test block',
    summary: 'Four weeks.',
    description: '# Test',
    weeks: [{ name: 'Week 1', phase: 'Build', description: null, days: [lifting, ...Array.from({ length: 6 }, (_, i) => day(i + 2))] }],
    ...overrides,
  };
}

describe('validatePlan', () => {
  it('accepts a well-formed plan', () => {
    expect(validatePlan(plan())).toEqual({ ok: true, plan: plan() });
  });

  it('requires exactly seven days a week', () => {
    const short = plan();
    short.weeks[0].days = short.weeks[0].days.slice(0, 5);
    expect(validatePlan(short)).toEqual({ ok: false, reason: `week 1 must have exactly ${PLAN_DAYS_PER_WEEK} days` });
  });

  it('rejects a lifting day with nothing in it', () => {
    const empty = plan();
    empty.weeks[0].days[0] = { ...lifting, exercises: [] };
    expect(validatePlan(empty)).toMatchObject({ ok: false, reason: expect.stringContaining('lifting day with no exercises') });
  });

  it('rejects an unknown day kind and more than eight weeks', () => {
    const odd = plan();
    (odd.weeks[0].days[1] as { kind: string }).kind = 'cardio';
    expect(validatePlan(odd)).toMatchObject({ ok: false });
    const long = plan({ weeks: Array.from({ length: 9 }, () => plan().weeks[0]) });
    expect(validatePlan(long)).toEqual({ ok: false, reason: 'more than 8 weeks' });
  });
});

describe('brief', () => {
  const brief = {
    goal: 'comp' as const,
    sport: 'volleyball' as const,
    courtDays: 2,
    season: null,
    liftDays: 4,
    sessionMinutes: 60,
    minimumMinutes: 15,
    obstacles: ['drop_off' as const],
    equipment: ['barbell', 'rack', 'bench', 'dumbbells'] as Equipment[],
    experience: 'years' as const,
    limitations: ['knee' as const],
    sacrifices: ['late_nights' as const],
    weeks: 6,
    notes: {},
  };

  it('validates the shape the app sends', () => {
    expect(isBrief(brief)).toBe(true);
    expect(isBrief({ ...brief, liftDays: 9 })).toBe(false);
    expect(isBrief({ ...brief, limitations: ['elbow'] })).toBe(false);
  });

  it('accepts a written answer in place of a card value, but not a blank', () => {
    expect(isBrief({ ...brief, equipment: null, notes: { equipment: 'a rack in the garage' } })).toBe(true);
    expect(isBrief({ ...brief, equipment: null })).toBe(false);
    expect(isBrief({ ...brief, equipment: null, notes: { equipment: '   ' } })).toBe(false);
    expect(briefToProse({ ...brief, equipment: null, notes: { equipment: 'a rack in the garage' } })).toContain(
      'Equipment, in their own words: "a rack in the garage"',
    );
  });

  it('reads back as prose the coach can use', () => {
    const prose = briefToProse(brief);
    expect(prose).toContain('peak for a competition, competing in 6 weeks');
    expect(prose).toContain('Sport: volleyball.');
    expect(prose).toContain('Court/field sessions a week: 2.');
    expect(prose).toContain('a knee to look after');
    expect(prose).toContain('late nights');
    expect(prose).toContain('Season: building to the competition.');
    expect(prose).toContain('about 15 minutes');
    expect(prose).toContain('starting strong then dropping off');
  });
});
