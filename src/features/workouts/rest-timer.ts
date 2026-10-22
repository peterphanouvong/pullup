/**
 * In-memory (not persisted, not synced) rest-timer state for the active
 * workout screen. Deliberately lives outside the Legend-State observables in
 * `store.ts` — the design calls for an in-app-only countdown (no push
 * notifications yet) that's fine to lose on app relaunch.
 *
 * Timestamp-derived by design: the stored shape is just `endsAt`, never a
 * remaining-seconds counter, so a consumer computing `remainingSeconds` after
 * the app was backgrounded for a while gets the correct answer with no drift
 * — there's nothing to have drifted.
 */

import { observable } from '@legendapp/state';

export interface RestTimerState {
  /** ISO timestamp the countdown reaches zero at. */
  endsAt: string;
  /** What the countdown started from, so a progress bar knows how much of
   * the rest has run. Grows with the ±15s adjust, which is what keeps the
   * bar honest instead of jumping backwards past full. */
  totalSeconds: number;
}

export const restTimer$ = observable<RestTimerState | null>(null);

/** Starts (or restarts, e.g. completing another set mid-rest) the countdown:
 * `seconds` from `now`. */
export function startRestTimer(seconds: number, now: Date = new Date()): void {
  restTimer$.set({
    endsAt: new Date(now.getTime() + seconds * 1000).toISOString(),
    totalSeconds: seconds,
  });
}

/** Moves the running countdown's end time by `deltaSeconds` (the ±15s
 * adjust buttons) — a no-op if no timer is running. */
export function adjustRestTimer(deltaSeconds: number): void {
  const current = restTimer$.get();
  if (!current) return;
  restTimer$.set({
    endsAt: new Date(new Date(current.endsAt).getTime() + deltaSeconds * 1000).toISOString(),
    // Adding time extends the whole rest, so the bar keeps reading
    // "fraction remaining" rather than overflowing past full.
    totalSeconds: Math.max(1, current.totalSeconds + deltaSeconds),
  });
}

/** Clears the countdown: Skip, or the bar's own auto-dismiss once it's run
 * out. */
export function skipRestTimer(): void {
  restTimer$.set(null);
}

/** Pure: whole seconds remaining at `now`. Can go negative once the
 * countdown has passed zero — callers clamp/format for display and decide
 * when to fire the haptic / auto-dismiss.
 *
 * Never more than `totalSeconds`: a `now` from before the countdown began
 * (the bar's clock is only refreshed by its 1s tick, so it's stale for the
 * first second of a new countdown) reads as the start, not as extra time.
 * The start is `endsAt - totalSeconds`, which the ±15s adjust keeps fixed. */
export function remainingSeconds(state: RestTimerState, now: Date): number {
  const endsAt = new Date(state.endsAt).getTime();
  const at = Math.max(now.getTime(), endsAt - state.totalSeconds * 1000);
  return Math.round((endsAt - at) / 1000);
}

/** Fraction of the rest still to run, 0–1 — the countdown bar's progress
 * line. Clamped at both ends so an overrun or a stretched timer can't push
 * the bar outside its track. */
export function remainingFraction(state: RestTimerState, now: Date = new Date()): number {
  const remaining = remainingSeconds(state, now);
  if (state.totalSeconds <= 0) return 0;
  return Math.min(1, Math.max(0, remaining / state.totalSeconds));
}
