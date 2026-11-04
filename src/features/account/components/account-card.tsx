import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as AppleAuthentication from 'expo-apple-authentication';
import { SymbolView } from 'expo-symbols';
import { Card } from '@/components/ui/card';
import { NativeButton } from '@/components/ui/native-button';
import { useSession } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { deleteAccount, saveDisplayName } from '../api';
import { useProfile, useSignInProvider } from '../hooks';
import { signOut } from '../sign-in';
import { promptForName, showError } from '../prompt-for-name';
import { PROVIDER_LABELS, useSignIn, useSignInProviders } from '../use-sign-in';

/** Matches NativeButton's large size, so Apple's button and ours line up. */
const BUTTON_HEIGHT = 50;

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
  const styles = useThemedStyles(createStyles);
  const providers = useSignInProviders();
  const { signIn } = useSignIn();

  return (
    <Card style={styles.guest}>
      <View style={styles.guestText}>
        <Text style={styles.title}>Save your training</Text>
        <Text style={styles.body}>
          {providers.any
            ? 'You’re training as a guest. Sign in to back up your workouts and get ready for crews.'
            : 'You’re training as a guest. Signing in needs the latest build of the app.'}
        </Text>
      </View>
      <View style={styles.buttons}>
        {providers.apple && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={BUTTON_HEIGHT / 2}
            style={styles.appleButton}
            onPress={() => void signIn('apple')}
          />
        )}
        {providers.google && <NativeButton label="Continue with Google" onPress={() => void signIn('google')} />}
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
