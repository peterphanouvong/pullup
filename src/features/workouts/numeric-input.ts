/**
 * Pure state-transition helpers for workout-logging's numeric TextInputs
 * (KG, REPS, TIME) plus the thin hook built on them.
 *
 * The inputs are fully controlled (`value` driven by the store) so they can
 * reflect the ghost-copied previous set's value immediately. A naive
 * `value={String(storedValue)}` + "parse on every keystroke, write straight
 * back to the store" approach breaks mid-typing: typing "72." parses to
 * `72`, the store round-trips back as `72`, and the re-render stomps the
 * input's own text back to "72" — eating the decimal point the user just
 * typed (the next keystroke lands as "725", not "72.5").
 *
 * Fix: keep the visible text in local state, independent of the store,
 * except when the store changes *from elsewhere* (e.g. tapping the
 * PREVIOUS ghost cell) — detected by comparing the incoming stored value
 * against the last value *this field itself* committed. If they match, the
 * store change was this field's own write echoing back; leave the local
 * text alone. If they differ, something else wrote the store — reseed the
 * visible text from it.
 */

import { useState } from 'react';

export interface NumericFieldState {
  text: string;
  /** The last numeric value this field itself wrote to the store (or the
   * value it was seeded with). Distinguishes "the store changed because I
   * just wrote it" from "the store changed from elsewhere" without needing
   * to know *why* the store changed. */
  lastCommitted: number | null;
}

/** Parses a numeric TextInput's raw text into a store value. Empty/blank
 * text is `null` (clears the field). Accepts "," as a decimal separator —
 * iOS's decimal-pad keyboard shows a comma instead of a period in many
 * locales. */
export function parseNumericInput(text: string): number | null {
  if (text.trim().length === 0) return null;
  const n = Number(text.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function seed(storedValue: number | null): NumericFieldState {
  return { text: storedValue != null ? String(storedValue) : '', lastCommitted: storedValue };
}

/** If `storedValue` doesn't match what this field last committed, something
 * else changed the store (e.g. the PREVIOUS ghost copy) — reseed the
 * visible text from it. Otherwise returns `state` unchanged (same
 * reference, so callers can cheaply tell "no change happened"). */
export function reseedIfExternal(state: NumericFieldState, storedValue: number | null): NumericFieldState {
  if (storedValue === state.lastCommitted) return state;
  return seed(storedValue);
}

/** One keystroke: updates the visible text immediately (so a trailing "."
 * or "," stays on screen) and returns the parsed value to commit to the
 * store. */
export function onTextChange(
  state: NumericFieldState,
  text: string,
): { state: NumericFieldState; commitValue: number | null } {
  const commitValue = parseNumericInput(text);
  return { state: { text, lastCommitted: commitValue }, commitValue };
}

/** Controlled-TextInput state for one numeric store field: holds in-flight
 * text locally (so a trailing "." or "," isn't stomped by the store's
 * round-tripped parsed value) and reseeds from the store when it changes
 * from elsewhere (e.g. the PREVIOUS ghost copy). `onCommit` is called with
 * the parsed number (or `null`) on every keystroke. */
export function useNumericField(
  storedValue: number | null,
  onCommit: (value: number | null) => void,
): { text: string; onChangeText: (text: string) => void } {
  const [state, setState] = useState<NumericFieldState>(() => seed(storedValue));

  // Adjust local state during render when the store moved out from under us
  // (React's sanctioned "derived state from props" pattern) — `current` is
  // `state` by reference when nothing external changed, so this never loops.
  const current = reseedIfExternal(state, storedValue);
  if (current !== state) setState(current);

  return {
    text: current.text,
    onChangeText: (text: string) => {
      const next = onTextChange(current, text);
      setState(next.state);
      onCommit(next.commitValue);
    },
  };
}
