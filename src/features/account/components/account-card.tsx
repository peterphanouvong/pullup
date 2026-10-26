import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as AppleAuthentication from 'expo-apple-authentication';
import { SymbolView } from 'expo-symbols';
import { Card } from '@/components/ui/card';
import { NativeButton } from '@/components/ui/native-button';
import { useSession } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { cleanDisplayName, deleteAccount, saveDisplayName, seedDisplayName } from '../api';
import { useProfile, useSignInProvider } from '../hooks';
import { googleSignInAvailable, signInWith, signOut, type SignInProvider } from '../sign-in';

const PROVIDER_LABELS: Record<SignInProvider, string> = { apple: 'Apple', google: 'Google' };
/** Matches NativeButton's large size, so Apple's button and ours line up. */
const BUTTON_HEIGHT = 50;

function showError(e: unknown) {
  Alert.alert('Something went wrong', e instanceof Error ? e.message : 'Please try again.');
}

/** Asks for the name crews will see. iOS-only (`Alert.prompt`), like the
 * rest of the app's chrome. Resolves once saved or dismissed. */
export function promptForName(defaultValue: string, onSave: (name: string) => Promise<void>) {
  Alert.prompt(
    'Your name',
    'This is what your crew will see.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save',
        onPress: (value?: string) => {
          const name = cleanDisplayName(value ?? '');
          if (name == null) return;
          onSave(name).then(() => haptics.select(), showError);
        },
      },
    ],
    'plain-text',
    defaultValue,
  );
}

/**
 * The top of Profile: who you are.
 *
 * A guest sees the case for signing in and the two buttons. Once signed in
 * it's a row with your name and how you sign in; tap it to rename.
 */
export function AccountCard() {
  const session = useSession();
  return session.user.is_anonymous ? <GuestCard /> : <AccountRow />;
}

function GuestCard() {
  const session = useSession();
  const queryClient = useQueryClient();
  const styles = useThemedStyles(createStyles);
  const [busy, setBusy] = useState(false);
  // False on a build without the native module (or off iOS); Apple's
  // button renders nothing there and warns, so don't render it.
  const appleAvailable = useQuery({
    queryKey: ['apple-sign-in-available'],
    queryFn: AppleAuthentication.isAvailableAsync,
    staleTime: Infinity,
  }).data === true;
  const anyAvailable = appleAvailable || googleSignInAvailable;

  async function nameAccount(userId: string, suggestedName: string | null) {
    const suggested = suggestedName == null ? null : cleanDisplayName(suggestedName);
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    if (suggested != null) {
      await seedDisplayName(userId, suggested);
      await refresh();
      return;
    }
    promptForName('', async (name) => {
      await saveDisplayName(userId, name);
      await refresh();
    });
  }

  async function handle(provider: SignInProvider) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await signInWith(provider);
      if (result.kind === 'cancelled') return;
      if (result.kind === 'linked') {
        haptics.success();
        await nameAccount(session.user.id, result.suggestedName);
        return;
      }
      haptics.warning();
      Alert.alert(
        'You already have an account',
        `This ${PROVIDER_LABELS[provider]} account is already on Pull Up. Switch to it? Anything logged as a guest on this phone stays with the guest.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Switch',
            onPress: () => {
              result
                .switchAccount()
                .then(async (userId) => {
                  haptics.success();
                  // The app remounts as the other user; only a provider name
                  // is seeded here — an existing name is never overwritten.
                  if (result.suggestedName != null) await nameAccount(userId, result.suggestedName);
                })
                .catch(showError);
            },
          },
        ],
      );
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={styles.guest}>
      <View style={styles.guestText}>
        <Text style={styles.title}>Save your training</Text>
        <Text style={styles.body}>
          {anyAvailable
            ? 'You’re training as a guest. Sign in to back up your workouts and get ready for crews.'
            : 'You’re training as a guest. Signing in needs the latest build of the app.'}
        </Text>
      </View>
      <View style={styles.buttons}>
        {appleAvailable && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={BUTTON_HEIGHT / 2}
            style={styles.appleButton}
            onPress={() => void handle('apple')}
          />
        )}
        {googleSignInAvailable && (
          <NativeButton label="Continue with Google" onPress={() => void handle('google')} />
        )}
      </View>
    </Card>
  );
}

function AccountRow() {
  const session = useSession();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const queryClient = useQueryClient();
  const profile = useProfile();
  const provider = useSignInProvider();

  const name = profile.data?.displayName ?? null;

  function rename() {
    haptics.tap();
    promptForName(name ?? '', async (next) => {
      await saveDisplayName(session.user.id, next);
      await queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] });
    });
  }

  return (
    <Pressable onPress={rename} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.avatar}>
        {name != null ? (
          <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
        ) : (
          <SymbolView name="person.fill" size={18} tintColor={theme.colors.onAccent} />
        )}
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.title} numberOfLines={1}>
          {name ?? (profile.isPending ? ' ' : 'Add your name')}
        </Text>
        <Text style={styles.detail}>
          {provider != null ? `Signed in with ${PROVIDER_LABELS[provider]}` : 'Signed in'}
        </Text>
      </View>
      <SymbolView name="pencil" size={15} tintColor={theme.colors.inkMuted} />
    </Pressable>
  );
}

/** Sign out and Delete account, for the bottom of Profile. Nothing for a
 * guest: there's no account to leave. */
export function AccountActions() {
  const session = useSession();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  if (session.user.is_anonymous) return null;

  function confirmSignOut() {
    haptics.warning();
    Alert.alert('Sign out?', 'Your workouts stay with your account. Sign back in to see them.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut().catch(showError) },
    ]);
  }

  function confirmDelete() {
    haptics.warning();
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account and every workout in it. It can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: () => void deleteAccount().catch(showError) },
      ],
    );
  }

  return (
    <View style={styles.actions}>
      <NativeButton label="Sign out" variant="ghost" labelColor={theme.colors.ink} onPress={confirmSignOut} />
      <NativeButton label="Delete account" variant="ghost" labelColor={theme.colors.danger} onPress={confirmDelete} />
    </View>
  );
}

const AVATAR = 40;

const createStyles = (theme: Theme) => StyleSheet.create({
  guest: { gap: theme.spacing.lg },
  guestText: { gap: theme.spacing.xs },
  title: { ...theme.type.heading, color: theme.colors.ink },
  body: { ...theme.type.body, color: theme.colors.inkMuted },
  detail: { ...theme.type.caption, color: theme.colors.inkMuted },
  buttons: { gap: theme.spacing.sm },
  appleButton: { height: BUTTON_HEIGHT, width: '100%' },
  // Same shape as Profile's hub rows, so the account reads as the first of them.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    backgroundColor: theme.colors.glass,
    borderRadius: theme.radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.glassBorder,
    padding: theme.spacing.lg,
    ...theme.shadow.card,
  },
  rowPressed: { opacity: 0.85 },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { ...theme.type.heading, color: theme.colors.onAccent },
  rowBody: { flex: 1, gap: 2 },
  actions: { gap: theme.spacing.xs, paddingTop: theme.spacing.lg },
});
