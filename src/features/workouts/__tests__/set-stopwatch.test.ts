import {
  elapsedStopwatchSeconds,
  setStopwatch$,
  startSetStopwatch,
  stopSetStopwatch,
} from '../set-stopwatch';

const at = (seconds: number) => new Date(1_700_000_000_000 + seconds * 1000);

describe('set stopwatch', () => {
  beforeEach(() => setStopwatch$.set(null));

  it('measures whole seconds from start to stop', () => {
    startSetStopwatch('s1', at(0));
    expect(elapsedStopwatchSeconds(setStopwatch$.peek()!, at(12.4))).toBe(12);
    expect(stopSetStopwatch(at(12.6))).toEqual({ setId: 's1', seconds: 13 });
    expect(setStopwatch$.peek()).toBeNull();
  });

  it('never logs a zero-second hold', () => {
    startSetStopwatch('s1', at(0));
    expect(stopSetStopwatch(at(0.2))).toEqual({ setId: 's1', seconds: 1 });
  });

  it('stopping with nothing running is a no-op', () => {
    expect(stopSetStopwatch(at(5))).toBeNull();
  });

  it('starting another set takes over the single clock', () => {
    startSetStopwatch('s1', at(0));
    startSetStopwatch('s2', at(30));
    expect(stopSetStopwatch(at(40))).toEqual({ setId: 's2', seconds: 10 });
  });
});
