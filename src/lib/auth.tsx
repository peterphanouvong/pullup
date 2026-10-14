import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { supabase } from './supabase';

const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used inside <AuthGate>');
  return session;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const styles = useThemedStyles(createStyles);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setSession(data.session);
        return;
      }
      const { data: anon, error: anonError } = await supabase.auth.signInAnonymously();
      if (cancelled) return;
      if (anonError) setError(anonError.message);
      else setSession(anon.session);
    })();
    return () => { cancelled = true; };
  }, [attempt]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Couldn&apos;t connect. Check your connection and try again.</Text>
        <Button title="Retry" onPress={() => setAttempt((a) => a + 1)} />
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
