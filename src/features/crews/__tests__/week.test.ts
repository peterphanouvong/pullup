import { crewWeekRange, normaliseInviteCode, orderMembers, toMemberWeek, type CrewMemberWeek } from '../week';

describe('crewWeekRange', () => {
  it('runs Monday to Sunday on the local calendar', () => {
    // Wednesday 22 October 2026, local time.
    const range = crewWeekRange(new Date(2026, 9, 22, 18, 30));
    expect(range.days).toEqual([
      '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25',
    ]);
    expect(new Date(range.fromIso).getTime()).toBe(new Date(2026, 9, 19).getTime());
    expect(new Date(range.toIso).getTime()).toBe(new Date(2026, 9, 26).getTime());
  });

  it('treats Sunday as the end of the week, not the start', () => {
    expect(crewWeekRange(new Date(2026, 9, 25, 9)).days[0]).toBe('2026-10-19');
  });
});

describe('toMemberWeek', () => {
  it('buckets sessions into local days and counts each session', () => {
    const morning = new Date(2026, 9, 20, 7).toISOString();
    const evening = new Date(2026, 9, 20, 19).toISOString();
    const member = toMemberWeek({
      user_id: 'u1',
      display_name: 'Sam',
      joined_at: '2026-10-01T00:00:00Z',
      session_starts: [morning, evening],
    });
    expect([...member.trainedDays]).toEqual(['2026-10-20']);
    expect(member.sessionCount).toBe(2);
  });
});

describe('orderMembers', () => {
  const member = (userId: string, sessionCount: number, joinedAt: string): CrewMemberWeek => ({
    userId,
    displayName: userId,
    joinedAt,
    trainedDays: new Set(),
    sessionCount,
  });

  it('puts you first, then most sessions, then earliest joiner', () => {
    const ordered = orderMembers(
      [member('late', 2, '2026-10-05'), member('me', 0, '2026-10-03'), member('top', 4, '2026-10-04'), member('early', 2, '2026-10-01')],
      'me',
    );
    expect(ordered.map((m) => m.userId)).toEqual(['me', 'top', 'early', 'late']);
  });
});

describe('normaliseInviteCode', () => {
  it('uppercases and strips spaces', () => {
    expect(normaliseInviteCode(' abc 23k ')).toBe('ABC23K');
  });

  it('rejects ambiguous characters and wrong lengths', () => {
    expect(normaliseInviteCode('ABC10O')).toBeNull();
    expect(normaliseInviteCode('ABCL23')).toBeNull();
    expect(normaliseInviteCode('ABC23')).toBeNull();
  });
});
