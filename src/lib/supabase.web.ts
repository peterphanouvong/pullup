// Web variant: no expo-sqlite import — the browser has a real `localStorage`,
// and expo-sqlite's web worker can't be serialized into static web output.
// `storage` is omitted (not `storage: localStorage`): referencing the bare
// `localStorage` global eagerly here crashes the node-environment render pass
// that `web.output: "static"` uses for SSR; supabase-js's own default already
// picks `globalThis.localStorage` in the browser and falls back to in-memory
// storage under SSR, via its internal `isBrowser()` check.
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
