import { dateKey, localDayOf, monthGrid, plannedDayOn, shiftMonth } from '../calendar';
import type { ProgramWeek } from '../types';

function week(position: number, days: { position: number; kind: 'lifting' | 'rest' | 'comp' | 'court' }[]): ProgramWeek {
  return {
    id: `w${position}`,
    position,
    name: `Week ${position}`,
    phase: 'Build',
    description: null,
    days: days.map((d) => ({
      id: `w${position}d${d.position}`,
      position: d.position,
      name: `Day ${d.position}`,
      kind: d.kind,
      notes: null,
      exercises: [],
    })),
  };
}

describe('monthGrid', () => {
  it('lays October 2026 out in Monday-first weeks, padded with neighbouring days', () => {
    // 1 Oct 2026 is a Thursday.
    const grid = monthGrid(2026, 9);
    expect(grid[0].map((c) => c.key)).toEqual([
      '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
    ]);
    expect(grid[0][2].inMonth).toBe(false);
    expect(grid[0][3].inMonth).toBe(true);
    expect(grid.every((w) => w.length === 7)).toBe(true);
    expect(grid.at(-1)!.map((c) => c.key)).toContain('2026-10-31');
    expect(grid.flat().filter((c) => c.inMonth)).toHaveLength(31);
  });

  it('adds no trailing week when the month ends on a Sunday', () => {
    // May 2026 ends on Sunday the 31st.
    const grid = monthGrid(2026, 4);
    expect(grid.at(-1)!.at(-1)!.key).toBe('2026-05-31');
  });
});

describe('plannedDayOn', () => {
  const weeks = [week(1, [{ position: 1, kind: 'lifting' }, { position: 7, kind: 'rest' }]), week(2, [{ position: 3, kind: 'comp' }])];
  const start = '2026-10-05'; // a Monday

  it('maps a date onto its week and day', () => {
    expect(plannedDayOn('2026-10-05', start, weeks)).toMatchObject({ weekPosition: 1, dayId: 'w1d1', kind: 'lifting' });
    expect(plannedDayOn('2026-10-14', start, weeks)).toMatchObject({ weekPosition: 2, dayId: 'w2d3', kind: 'comp' });
  });

  it('is null before the start, past the end, and on gaps in the plan', () => {
    expect(plannedDayOn('2026-10-04', start, weeks)).toBeNull();
    expect(plannedDayOn('2026-10-25', start, weeks)).toBeNull();
    expect(plannedDayOn('2026-10-06', start, weeks)).toBeNull();
  });

  it('is not thrown by a daylight-saving change inside the range', () => {
    // Sydney moves clocks forward on 4 Oct 2026; whole days must still count.
    expect(plannedDayOn('2026-10-11', '2026-09-28', [week(2, [{ position: 7, kind: 'rest' }])])).toMatchObject({
      weekPosition: 2,
      dayId: 'w2d7',
    });
  });
});

describe('date keys', () => {
  it('formats local dates and maps instants to their local day', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    const local = new Date(2026, 9, 15, 23, 30);
    expect(localDayOf(local.toISOString())).toBe('2026-10-15');
  });
});

describe('shiftMonth', () => {
  it('rolls over year boundaries', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });
});
