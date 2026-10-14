import {
  adjustRestTimer,
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
});
