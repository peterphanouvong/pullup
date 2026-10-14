// Pure state-transition tests for the KG/REPS/TIME inputs' in-flight-text
// fix (fix-round-2 finding 1): a fully store-controlled input stomps a
// trailing "." or "," on every re-render because the store round-trips back
// the already-parsed number. No React render needed — `useNumericField`'s
// hook body is a thin wrapper over these three pure functions.

import { onTextChange, parseNumericInput, reseedIfExternal } from '../numeric-input';
import type { NumericFieldState } from '../numeric-input';

describe('parseNumericInput', () => {
  it('parses a plain number', () => {
    expect(parseNumericInput('72')).toBe(72);
  });

  it('accepts "," as a decimal separator (iOS decimal-pad locales)', () => {
    expect(parseNumericInput('72,5')).toBe(72.5);
  });

  it('accepts "." as a decimal separator', () => {
    expect(parseNumericInput('72.5')).toBe(72.5);
  });

  it('blank/whitespace-only text clears the field (null)', () => {
    expect(parseNumericInput('')).toBeNull();
    expect(parseNumericInput('   ')).toBeNull();
  });

  it('non-numeric text is null', () => {
    expect(parseNumericInput('abc')).toBeNull();
  });
});

describe('onTextChange', () => {
  it('"72." stays visible: the trailing "." is kept in the returned text even though it commits 72', () => {
    const state: NumericFieldState = { text: '', lastCommitted: null };
    const { state: next, commitValue } = onTextChange(state, '72.');
    expect(next.text).toBe('72.');
    expect(commitValue).toBe(72);
    expect(next.lastCommitted).toBe(72);
  });

  it('"72,5" commits 72.5', () => {
    const state: NumericFieldState = { text: '72', lastCommitted: 72 };
    const { state: next, commitValue } = onTextChange(state, '72,5');
    expect(next.text).toBe('72,5');
    expect(commitValue).toBe(72.5);
    expect(next.lastCommitted).toBe(72.5);
  });

  it('clearing the field commits null and keeps the empty text', () => {
    const state: NumericFieldState = { text: '72', lastCommitted: 72 };
    const { state: next, commitValue } = onTextChange(state, '');
    expect(next.text).toBe('');
    expect(commitValue).toBeNull();
  });
});

describe('reseedIfExternal', () => {
  it('leaves state untouched (same reference) when the store echoes back this field\'s own last commit', () => {
    // After typing "72." the store round-trips back 72 — must not stomp "72.".
    const state: NumericFieldState = { text: '72.', lastCommitted: 72 };
    const result = reseedIfExternal(state, 72);
    expect(result).toBe(state);
    expect(result.text).toBe('72.');
  });

  it('re-seeds the visible text when the store changes from elsewhere (ghost-copy)', () => {
    const state: NumericFieldState = { text: '72.', lastCommitted: 72 };
    const result = reseedIfExternal(state, 100);
    expect(result).not.toBe(state);
    expect(result.text).toBe('100');
    expect(result.lastCommitted).toBe(100);
  });

  it('re-seeds to an empty string when the store value becomes null from elsewhere', () => {
    const state: NumericFieldState = { text: '72', lastCommitted: 72 };
    const result = reseedIfExternal(state, null);
    expect(result.text).toBe('');
    expect(result.lastCommitted).toBeNull();
  });
});
