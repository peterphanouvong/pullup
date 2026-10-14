import { currentProgramPosition, mondayOf, nextCompDay } from '../schedule';
import type { ProgramWeek } from '../types';

describe('mondayOf', () => {
  it('returns the same date when today is already a Monday', () => {
    expect(mondayOf(new Date(2026, 0, 12))).toBe('2026-01-12');
  });

  it('returns the Monday of the current week for a mid-week date', () => {
    expect(mondayOf(new Date(2026, 0, 15))).toBe('2026-01-12'); // Thursday
  });

  it('returns the Monday of the current week for a Sunday', () => {
    expect(mondayOf(new Date(2026, 0, 18))).toBe('2026-01-12'); // Sunday
  });

  it('crosses a month boundary', () => {
    expect(mondayOf(new Date(2026, 1, 1))).toBe('2026-01-26'); // Sun Feb 1 -> Mon Jan 26
  });

  it('does not shift the day when computed from a 01:00 local instant in a UTC+11 zone', () => {
    const originalTz = process.env.TZ;
    process.env.TZ = 'Australia/Sydney';
    try {
      const earlyMorning = new Date(2026, 0, 13, 1, 0, 0); // Tue 01:00 local
      // Sanity check: converting this instant to UTC WOULD shift it back a day.
      expect(earlyMorning.toISOString().slice(0, 10)).toBe('2026-01-12');
      expect(mondayOf(earlyMorning)).toBe('2026-01-12');
    } finally {
      process.env.TZ = originalTz;
    }
  });
});

describe('currentProgramPosition', () => {
  const START = '2026-01-12'; // Monday
  const TOTAL_WEEKS = 3;

  it('is week 1 day 1 when today is the start date', () => {
    expect(currentProgramPosition(START, new Date(2026, 0, 12), TOTAL_WEEKS)).toEqual({
      week: 1,
      day: 1,
      finished: false,
    });
  });

  it('reaches day 7 (Sunday) at the end of week 1', () => {
    expect(currentProgramPosition(START, new Date(2026, 0, 18), TOTAL_WEEKS)).toEqual({
      week: 1,
      day: 7,
      finished: false,
    });
  });

  it('rolls over into week 2 day 1 the next day', () => {
    expect(currentProgramPosition(START, new Date(2026, 0, 19), TOTAL_WEEKS)).toEqual({
      week: 2,
      day: 1,
      finished: false,
    });
  });

  it('clamps to week 1 day 1 (preview, not finished) before the start date', () => {
    expect(currentProgramPosition(START, new Date(2026, 0, 5), TOTAL_WEEKS)).toEqual({
      week: 1,
      day: 1,
      finished: false,
    });
    expect(currentProgramPosition(START, new Date(2026, 0, 10), TOTAL_WEEKS)).toEqual({
      week: 1,
      day: 1,
      finished: false,
    });
  });

  it('is not finished on the very last day of the programme', () => {
    expect(currentProgramPosition(START, new Date(2026, 1, 1), TOTAL_WEEKS)).toEqual({
      week: 3,
      day: 7,
      finished: false,
    });
  });

  it('clamps to the last week, finished, once past the programme end', () => {
    expect(currentProgramPosition(START, new Date(2026, 1, 2), TOTAL_WEEKS)).toEqual({
      week: 3,
      day: 7,
      finished: true,
    });
  });

  it('does not shift a day when today is a 01:00 local instant in a UTC+11 zone', () => {
    const originalTz = process.env.TZ;
    process.env.TZ = 'Australia/Sydney';
    try {
      const earlyMorning = new Date(2026, 0, 13, 1, 0, 0); // Tue 01:00 local, one day after start
      expect(currentProgramPosition(START, earlyMorning, TOTAL_WEEKS)).toEqual({
        week: 1,
        day: 2,
        finished: false,
      });
    } finally {
      process.env.TZ = originalTz;
    }
  });
});

describe('nextCompDay', () => {
  const weeks: ProgramWeek[] = [
    {
      id: 'w1',
      position: 1,
      name: 'Week 1',
      phase: 'Load',
      description: null,
      days: [
        { id: 'd1-1', position: 1, name: 'Mon — Lower power', kind: 'lifting', notes: null, exercises: [] },
        { id: 'd1-7', position: 7, name: 'Sun — Comp A', kind: 'comp', notes: null, exercises: [] },
      ],
    },
    {
      id: 'w2',
      position: 2,
      name: 'Week 2',
      phase: 'Load',
      description: null,
      days: [{ id: 'd2-7', position: 7, name: 'Sun — Comp B', kind: 'comp', notes: null, exercises: [] }],
    },
  ];
  const START = '2026-01-12'; // Monday

  it('finds the next comp day after the current position within the same week', () => {
    const result = nextCompDay(weeks, { week: 1, day: 3 }, START, new Date(2026, 0, 14));
    expect(result).toEqual({ dayName: 'Sun — Comp A', date: '2026-01-18', daysAway: 4 });
  });

  it('includes a comp day exactly at the current position', () => {
    const result = nextCompDay(weeks, { week: 1, day: 7 }, START, new Date(2026, 0, 18));
    expect(result).toEqual({ dayName: 'Sun — Comp A', date: '2026-01-18', daysAway: 0 });
  });

  it('does not return a comp day from an earlier week than the current position', () => {
    const result = nextCompDay(weeks, { week: 2, day: 1 }, START, new Date(2026, 0, 19));
    expect(result).toEqual({ dayName: 'Sun — Comp B', date: '2026-01-25', daysAway: 6 });
  });

  it('returns null when no comp day remains at or after the position', () => {
    const result = nextCompDay(weeks, { week: 3, day: 1 }, START, new Date(2026, 1, 2));
    expect(result).toBeNull();
  });
});
