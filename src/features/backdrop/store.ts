import { observable } from '@legendapp/state';
import { useSelector } from '@legendapp/state/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_VIBES, DEFAULTS_VERSION, VIBES, type Vibe, type VibeSettings } from './vibes';

// Keyed by the defaults' version: a new set of defaults in code starts
// everyone from it, rather than being hidden behind an old save.
const STORAGE_KEY = `vibe-settings:v${DEFAULTS_VERSION}`;

const clone = (): Record<Vibe, VibeSettings> =>
  Object.fromEntries(VIBES.map((v) => [v, { ...DEFAULT_VIBES[v], colors: [...DEFAULT_VIBES[v].colors] }])) as Record<
    Vibe,
    VibeSettings
  >;

/** Every page's backdrop settings, live. Starts from the defaults; the
 * saved copy (if any) lands a moment after launch. */
export const vibes$ = observable<Record<Vibe, VibeSettings>>(clone());

/** Saved settings win field by field over the defaults, so a new field
 * added later still has a value on a device with an old save. */
function merge(saved: Partial<Record<Vibe, Partial<VibeSettings>>>): Record<Vibe, VibeSettings> {
  const base = clone();
  for (const v of VIBES) {
    const s = saved[v];
    if (s != null && typeof s === 'object') base[v] = { ...base[v], ...s, colors: s.colors ?? base[v].colors };
  }
  return base;
}

let loading: Promise<void> | null = null;

/** Loads the saved settings once, then keeps the save current. */
export function loadVibes(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) vibes$.set(merge(JSON.parse(raw)));
    } catch {
      // A bad save is just the defaults.
    }
    vibes$.onChange(({ value }) => {
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    });
  })();
  return loading;
}

export function useVibe(vibe: Vibe): VibeSettings {
  return useSelector(() => vibes$[vibe].get());
}

export function resetVibe(vibe: Vibe): void {
  vibes$[vibe].set({ ...DEFAULT_VIBES[vibe], colors: [...DEFAULT_VIBES[vibe].colors] });
}

export function resetAllVibes(): void {
  vibes$.set(clone());
}
