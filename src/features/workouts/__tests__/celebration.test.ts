import { celebrationCopy, formatCountdown } from '../celebration';

describe('formatCountdown', () => {
  it('singularises one day and never says zero', () => {
    expect(formatCountdown(4)).toBe('4 days to comp.');
    expect(formatCountdown(1)).toBe('1 day to comp.');
    expect(formatCountdown(0)).toBe('Comp day.');
    expect(formatCountdown(-2)).toBe('Comp day.');
  });
});

describe('celebrationCopy', () => {
  it('calls out a completed week ahead of the countdown', () => {
    expect(celebrationCopy({ sessionsDone: 4, sessionsPlanned: 4, daysToComp: 3 })).toEqual({
      headline: 'Week complete',
      detail: 'All 4 sessions done. 3 days to comp.',
    });
  });

  it('reports progress through the week when sessions remain', () => {
    expect(celebrationCopy({ sessionsDone: 2, sessionsPlanned: 4, daysToComp: 5 })).toEqual({
      headline: 'Session logged',
      detail: '2 of 4 this week. 5 days to comp.',
    });
  });

  it('drops the countdown when no competition is scheduled', () => {
    expect(celebrationCopy({ sessionsDone: 2, sessionsPlanned: 4, daysToComp: null })).toEqual({
      headline: 'Session logged',
      detail: '2 of 4 this week',
    });
  });

  it('still says something for an unplanned workout', () => {
    expect(celebrationCopy({ sessionsDone: 1, sessionsPlanned: 0, daysToComp: null })).toEqual({
      headline: 'Session logged',
      detail: 'Off-programme, still counts.',
    });
    expect(celebrationCopy({ sessionsDone: 1, sessionsPlanned: 0, daysToComp: 2 })).toEqual({
      headline: 'Session logged',
      detail: '2 days to comp.',
    });
  });
});
