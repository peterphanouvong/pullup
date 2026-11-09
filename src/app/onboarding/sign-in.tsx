import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { NativeButton } from '@/components/ui/native-button';
import { useSession } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { useSignIn, useSignInProviders } from '@/features/account/use-sign-in';
import { ShaderScrollView } from '@/features/backdrop/shader-scroll-view';
import { useMarkOnboarded } from '@/features/onboarding/gate';
import { leaveOnboarding } from '@/features/onboarding/leave';
import { fetchActiveProgram } from '@/features/programs/api';

/** Apple's button is a fixed height; ours match it so the stack reads as
 * one set of pills. */
const BUTTON_HEIGHT = 50;

/**
 * "Sign in", the Suno way: the gradient, the word, and the providers as a
 * stack of white pills. For someone who already has training on an
 * account, before any of the interview.
 *
 * The hook does the work (link the guest, or switch to the existing
 * account). Once the session is no longer a guest this screen decides
 * where that leaves them: an account with a programme is done with
 * onboarding and goes straight to its week; an account without one
 * carries on into the interview with the name step prefilled.
 */
export default function SignInScreen() {
  const session = useSession();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const providers = useSignInProviders();
  const { busy, signIn } = useSignIn();
  const markOnboarded = useMarkOnboarded(session.user.id);
  const isGuest = session.user.is_anonymous ?? false;
  // Signed in: this screen is only ever on its way out, looking up where
  // to go, so "checking" is simply "no longer a guest".
  const checking = !isGuest;

  useEffect(() => {
    if (isGuest) return;
    let cancelled = false;
    fetchActiveProgram(session.user.id)
      .then(async (active) => {
        if (cancelled) return;
        if (active != null) {
          haptics.success();
          await markOnboarded();
          leaveOnboarding();
        } else {
          router.replace('/onboarding/name');
        }
      })
      .catch(() => {
        // Couldn't ask: into the app. The programme tab sorts out which
        // it really is once it loads, and brings the interview back for
        // an account that has no programme. Sending them to the name
        // step here would drag an existing account through the interview
        // over a dropped request.
        if (!cancelled) leaveOnboarding();
      });
    return () => {
      cancelled = true;
    };
    // Runs once the session stops being a guest; the rest are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest, session.user.id]);

  const waiting = busy || checking;

  return (
    <ShaderScrollView
      vibe="celebration"
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <View style={styles.heading}>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>
          {checking ? 'Finding your program…' : 'Your program, workouts and crew are right where you left them.'}
        </Text>
      </View>
      <View style={styles.buttons}>
        {providers.apple && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={BUTTON_HEIGHT / 2}
            style={[styles.appleButton, waiting && styles.dimmed]}
            onPress={() => {
              if (!waiting) void signIn('apple');
            }}
          />
        )}
        {providers.google && (
          <NativeButton
            label="Continue with Google"
            tint="#FFFFFF"
            labelColor="#000000"
            disabled={waiting}
            onPress={() => void signIn('google')}
          />
        )}
        {!providers.any && <Text style={styles.note}>Signing in needs the latest build of the app.</Text>}
        <Text style={styles.note}>
          Using an Apple ID or Google account that’s already on Pull Up switches this phone to that account.
        </Text>
      </View>
    </ShaderScrollView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: theme.spacing.lg, gap: theme.spacing.xl * 1.5 },
  heading: { alignItems: 'center', gap: theme.spacing.sm },
  title: { fontSize: 40, fontWeight: '800', letterSpacing: -1, color: theme.colors.ink, textAlign: 'center' },
  subtitle: { ...theme.type.body, color: theme.colors.inkMuted, textAlign: 'center', maxWidth: 300 },
  buttons: { gap: theme.spacing.sm },
  appleButton: { height: BUTTON_HEIGHT, width: '100%' },
  dimmed: { opacity: 0.5 },
  note: { ...theme.type.caption, color: theme.colors.inkMuted, textAlign: 'center', paddingTop: theme.spacing.xs },
});
