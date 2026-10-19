import { checkinDetail, checkinHeadline, dayLabel, feedRange, myReaction, toCheckin, withMyReaction, type Checkin } from '../feed';

const checkin = (overrides: Partial<Checkin> = {}): Checkin => ({
  workoutId: 'w1',
  userId: 'bea',
  displayName: 'Bea',
  dayName: 'Wed — Upper A',
  startedAt: new Date(2026, 9, 21, 7, 0).toISOString(),
  finishedAt: new Date(2026, 9, 21, 7, 48).toISOString(),
  completedSets: 14,
  reactions: [],
  ...overrides,
});

describe('toCheckin', () => {
  it('drops reactions that are not one of the presets', () => {
    const c = toCheckin({
      workout_id: 'w1', user_id: 'bea', display_name: 'Bea', day_name: null,
      started_at: 's', finished_at: 'f', completed_sets: 3,
      reactions: [{ user_id: 'a', display_name: 'Alex', emoji: '🔥' }, { user_id: 'x', display_name: 'X', emoji: '💩' }],
    });
    expect(c.reactions).toEqual([{ userId: 'a', displayName: 'Alex', emoji: '🔥' }]);
  });
});

describe('feedRange', () => {
  it('covers today and the six days before it', () => {
    const r = feedRange(new Date(2026, 9, 21, 15));
    expect(new Date(r.fromIso)).toEqual(new Date(2026, 9, 15));
    expect(new Date(r.toIso)).toEqual(new Date(2026, 9, 22));
  });
});

describe('checkinHeadline', () => {
  it('names the programme day without its weekday prefix, and says You for yourself', () => {
    expect(checkinHeadline(checkin(), 'me')).toBe('Bea finished Upper A');
    expect(checkinHeadline(checkin({ userId: 'me' }), 'me')).toBe('You finished Upper A');
  });

  it('calls an off-plan session a workout, never its title', () => {
    expect(checkinHeadline(checkin({ dayName: null }), 'me')).toBe('Bea finished a workout');
  });
});

describe('checkinDetail and dayLabel', () => {
  it('shows the day, duration in minutes and the set count', () => {
    expect(checkinDetail(checkin(), new Date(2026, 9, 21, 20))).toBe('Today · 48 min · 14 sets');
    expect(checkinDetail(checkin({ completedSets: 1 }), new Date(2026, 9, 22, 20))).toBe('Yesterday · 48 min · 1 set');
  });

  it('falls back to the weekday further back', () => {
    expect(dayLabel('2026-10-19', new Date(2026, 9, 23))).toBe('Monday');
  });
});

describe('reactions', () => {
  const feed = [checkin({ reactions: [{ userId: 'me', displayName: 'Me', emoji: '🔥' }, { userId: 'a', displayName: 'Alex', emoji: '👏' }] })];

  it('finds your own reaction', () => {
    expect(myReaction(feed[0], 'me')).toBe('🔥');
    expect(myReaction(feed[0], 'nobody')).toBeNull();
  });

  it('swaps your reaction and leaves everyone else alone', () => {
    const next = withMyReaction(feed, 'w1', 'me', 'Me', '💪');
    expect(next[0].reactions.map((r) => r.emoji)).toEqual(['👏', '💪']);
  });

  it('removes your reaction when set to null', () => {
    const next = withMyReaction(feed, 'w1', 'me', 'Me', null);
    expect(next[0].reactions.map((r) => r.userId)).toEqual(['a']);
  });
});
