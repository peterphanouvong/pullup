/**
 * In-memory stopwatch for one timed set: the play button on an empty TIME
 * cell starts it, stop writes the elapsed seconds into the set. Like the
 * rest timer it's a timestamp (`startedAt`), never a counter, so time spent
 * backgrounded still counts and nothing drifts. One at a time: starting a
 * second one stops the first, which is how a lifter moves from one hold to
 * the next without a stray clock running.
 */

import { observable } from '@legendapp/state';

export interface SetStopwatchState {
  setId: string;
  /** ISO timestamp the stopwatch started at. */
  startedAt: string;
}

export const setStopwatch$ = observable<SetStopwatchState | null>(null);

export function startSetStopwatch(setId: string, now: Date = new Date()): void {
  setStopwatch$.set({ setId, startedAt: now.toISOString() });
}

/** Stops the running stopwatch and returns what it measured, or null if
 * none was running. Whole seconds, at least 1: a tap-and-stop still logs
 * something, never a zero-second hold. */
export function stopSetStopwatch(now: Date = new Date()): { setId: string; seconds: number } | null {
  const current = setStopwatch$.peek();
  if (!current) return null;
  setStopwatch$.set(null);
  return { setId: current.setId, seconds: elapsedStopwatchSeconds(current, now) };
}

/** Pure: whole seconds run so far, never below 1. */
export function elapsedStopwatchSeconds(state: SetStopwatchState, now: Date): number {
  return Math.max(1, Math.round((now.getTime() - new Date(state.startedAt).getTime()) / 1000));
}
