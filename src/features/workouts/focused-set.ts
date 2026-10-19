import { observable } from '@legendapp/state';

export type FillField = 'weight' | 'reps' | 'duration';

/** The set input that has the keyboard, if any. The workout screen's
 * fill-down bar reads it to know which row and column to fill from. */
export const focusedSet$ = observable<{ setId: string; field: FillField } | null>(null);

export function focusSetField(setId: string, field: FillField): void {
  focusedSet$.set({ setId, field });
}

/** Clears only if this field is still the focused one: moving between two
 * inputs blurs the first before focusing the second, and a late blur must
 * not wipe the new focus. */
export function blurSetField(setId: string, field: FillField): void {
  const current = focusedSet$.peek();
  if (current?.setId === setId && current.field === field) focusedSet$.set(null);
}
