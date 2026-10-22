import {
  adjustRestTimer,
  remainingFraction,
  remainingSeconds,
  restTimer$,
  skipRestTimer,
  startRestTimer,
} from '../rest-timer';

describe('rest timer', () => {
  beforeEach(() => {
    restTimer$.set(null);
  });

  it('starts a countdown ending `seconds` after `now`', () => {
    const now = new Date('2026-10-14T12:00:00.000Z');
    startRestTimer(90, now);
    const state = restTimer$.get();
    expect(state?.endsAt).toBe(new Date('2026-10-14T12:01:30.000Z').toISOString());
    expect(remainingSeconds(state!, now)).toBe(90);
    expect(remainingSeconds(state!, new Date('2026-10-14T12:01:00.000Z'))).toBe(30);
  });

  it('adjustRestTimer moves endsAt by the given delta and is a no-op with no timer running', () => {
    const now = new Date('2026-10-14T12:00:00.000Z');
    startRestTimer(60, now);
    adjustRestTimer(15);
    expect(remainingSeconds(restTimer$.get()!, now)).toBe(75);
    adjustRestTimer(-15);
    expect(remainingSeconds(restTimer$.get()!, now)).toBe(60);

    skipRestTimer();
    adjustRestTimer(15);
    expect(restTimer$.get()).toBeNull();
  });

  it('skipRestTimer clears the state', () => {
    startRestTimer(60, new Date());
    skipRestTimer();
    expect(restTimer$.get()).toBeNull();
  });

  it('remainingSeconds can go negative once the countdown has passed zero', () => {
    const now = new Date('2026-10-14T12:00:00.000Z');
    startRestTimer(30, now);
    const state = restTimer$.get()!;
    expect(remainingSeconds(state, new Date('2026-10-14T12:00:45.000Z'))).toBe(-15);
  });

  it('a clock from before the start reads the full countdown, not more', () => {
    startRestTimer(30, new Date('2026-10-14T12:00:00.000Z'));
    const state = restTimer$.get()!;
    // The bar's last tick was 2s before play was pressed.
    expect(remainingSeconds(state, new Date('2026-10-14T11:59:58.000Z'))).toBe(30);
    expect(remainingFraction(state, new Date('2026-10-14T11:59:58.000Z'))).toBe(1);
  });
});

describe('remainingFraction', () => {
  const now = new Date('2026-10-14T12:00:00.000Z');

  it('runs from full to empty over the rest', () => {
    startRestTimer(60, now);
    const state = restTimer$.get()!;
    expect(remainingFraction(state, now)).toBe(1);
    expect(remainingFraction(state, new Date('2026-10-14T12:00:30.000Z'))).toBe(0.5);
    expect(remainingFraction(state, new Date('2026-10-14T12:01:00.000Z'))).toBe(0);
  });

  it('clamps once the countdown has overrun', () => {
    startRestTimer(60, now);
    expect(remainingFraction(restTimer$.get()!, new Date('2026-10-14T12:02:00.000Z'))).toBe(0);
  });

  it('stays within the track when time is added mid-rest', () => {
    startRestTimer(60, now);
    adjustRestTimer(15);
    const fraction = remainingFraction(restTimer$.get()!, now);
    expect(fraction).toBeLessThanOrEqual(1);
    expect(fraction).toBeGreaterThan(0.9);
  });
});
