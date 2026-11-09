import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { resetIdentity } from './analytics';
import { supabase } from './supabase';

const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used inside <AuthGate>');
  return session;
}

/**
 * Holds the app until there's a session, and keeps it current.
 *
 * Every change flows through `onAuthStateChange`: linking Apple/Google
 * onto the guest (same user, now permanent), switching to an existing
 * account, signing out. With no session — first launch, or just signed
 * out — it signs in anonymously, so the app always has a user.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  // undefined: not known yet. null: known to be signed out.
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const identifiedUserId = useRef<string | null>(null);
  const styles = useThemedStyles(createStyles);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      const nextUserId = next?.user.id ?? null;
      // A linked provider preserves the guest's Supabase id, but signing out
      // or switching to an existing account does not. Clear PostHog before
      // AuthGate exposes the next session so its events and errors cannot be
      // attributed to the person who just left.
      if (event === 'SIGNED_OUT' || (identifiedUserId.current != null && nextUserId !== identifiedUserId.current)) {
        resetIdentity();
      }
      identifiedUserId.current = nextUserId;
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session !== null) return;
    let cancelled = false;
    void supabase.auth.signInAnonymously().then(({ error: anonError }) => {
      if (!cancelled && anonError) setError(anonError.message);
    });
    return () => { cancelled = true; };
  }, [session, attempt]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Couldn&apos;t connect. Check your connection and try again.</Text>
        <Button title="Retry" onPress={() => {
            setError(null);
            setAttempt((a) => a + 1);
          }} />
      </View>
    );
  }
  if (!session) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />
      </View>
    );
  }
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.canvas,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.canvas,
  },
  message: { ...theme.type.body, color: theme.colors.ink },
});
