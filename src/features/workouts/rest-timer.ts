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
}

export const restTimer$ = observable<RestTimerState | null>(null);

/** Starts (or restarts, e.g. completing another set mid-rest) the countdown:
 * `seconds` from `now`. */
export function startRestTimer(seconds: number, now: Date = new Date()): void {
  restTimer$.set({ endsAt: new Date(now.getTime() + seconds * 1000).toISOString() });
}

/** Moves the running countdown's end time by `deltaSeconds` (the ±15s
 * adjust buttons) — a no-op if no timer is running. */
export function adjustRestTimer(deltaSeconds: number): void {
  const current = restTimer$.get();
  if (!current) return;
  restTimer$.set({ endsAt: new Date(new Date(current.endsAt).getTime() + deltaSeconds * 1000).toISOString() });
}

/** Clears the countdown: Skip, or the bar's own auto-dismiss once it's run
 * out. */
export function skipRestTimer(): void {
  restTimer$.set(null);
}

/** Pure: whole seconds remaining at `now`. Can go negative once the
 * countdown has passed zero — callers clamp/format for display and decide
 * when to fire the haptic / auto-dismiss. */
export function remainingSeconds(state: RestTimerState, now: Date): number {
  return Math.round((new Date(state.endsAt).getTime() - now.getTime()) / 1000);
}
