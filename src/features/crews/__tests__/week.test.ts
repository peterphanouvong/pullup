import { crewWeekRange, normaliseInviteCode, orderMembers, toMemberWeek, withLocalSessions, type CrewMemberWeek } from '../week';

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
      weekly_target: 3,
      streak: 2,
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
    weeklyTarget: 3,
    streak: 0,
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

describe('withLocalSessions', () => {
  const range = crewWeekRange(new Date(2026, 10, 4)); // Wed 4 Nov 2026
  const member = (userId: string, days: string[]) => ({
    userId,
    displayName: userId,
    joinedAt: '2026-01-01T00:00:00Z',
    trainedDays: new Set(days),
    sessionCount: days.length,
    weeklyTarget: 3,
    streak: 0,
  });

  it('counts this phone’s sessions against you even before they reach the server', () => {
    const members = [member('me', []), member('mate', ['2026-11-02'])];
    const merged = withLocalSessions(members, 'me', ['2026-11-03T18:00:00', '2026-10-20T18:00:00'], range);
    expect(merged[0].sessionCount).toBe(1);
    expect(merged[0].trainedDays.has('2026-11-03')).toBe(true);
    expect(merged[1]).toBe(members[1]);
  });

  it('never lowers what the server already knows', () => {
    const merged = withLocalSessions([member('me', ['2026-11-02', '2026-11-03'])], 'me', ['2026-11-03T18:00:00'], range);
    expect(merged[0].sessionCount).toBe(2);
  });
});
