import { sessionsThisWeek, weekStreak } from '../streak';

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 7).toISOString();
// Wednesday 21 October 2026.
const now = new Date(2026, 9, 21, 12);

describe('weekStreak', () => {
  it('counts consecutive met weeks and does not break on the current, unfinished week', () => {
    const sessions = [at(2026, 10, 5), at(2026, 10, 7), at(2026, 10, 12), at(2026, 10, 14), at(2026, 10, 19)];
    expect(weekStreak(sessions, 2, now)).toBe(2);
  });

  it('includes the current week once it is met', () => {
    const sessions = [at(2026, 10, 12), at(2026, 10, 14), at(2026, 10, 19), at(2026, 10, 20)];
    expect(weekStreak(sessions, 2, now)).toBe(2);
  });

  it('breaks at the first missed completed week', () => {
    const sessions = [at(2026, 9, 28), at(2026, 9, 30), at(2026, 10, 12), at(2026, 10, 14)];
    expect(weekStreak(sessions, 2, now)).toBe(1);
  });

  it('is zero with nothing met', () => {
    expect(weekStreak([at(2026, 10, 19)], 3, now)).toBe(0);
    expect(weekStreak([], 1, now)).toBe(0);
  });

  it('puts a late Sunday session in the week that is ending, not the next one', () => {
    const sunday = new Date(2026, 9, 18, 23, 30).toISOString();
    expect(weekStreak([sunday], 1, now)).toBe(1);
  });
});

describe('sessionsThisWeek', () => {
  it('counts only the current local week', () => {
    expect(sessionsThisWeek([at(2026, 10, 18), at(2026, 10, 19), at(2026, 10, 21)], now)).toBe(2);
  });
});
