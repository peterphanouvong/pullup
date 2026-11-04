import { useState } from 'react';
import { Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useSession } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { cleanDisplayName, saveDisplayName, seedDisplayName } from './api';
import { promptForName, showError } from './prompt-for-name';
import { googleSignInAvailable, signInWith, type SignInProvider } from './sign-in';
import { adoptSticker } from '@/features/sticker/hooks';

export const PROVIDER_LABELS: Record<SignInProvider, string> = { apple: 'Apple', google: 'Google' };

/** Which providers this build can offer. Apple's module is asked once;
 * Google is a build-time fact. */
export function useSignInProviders(): { apple: boolean; google: boolean; any: boolean } {
  const apple =
    useQuery({
      queryKey: ['apple-sign-in-available'],
      queryFn: AppleAuthentication.isAvailableAsync,
      staleTime: Infinity,
    }).data === true;
  return { apple, google: googleSignInAvailable, any: apple || googleSignInAvailable };
}

/**
 * The sign-in gesture, shared by the welcome screen and the Profile card.
 *
 * Linking the provider onto the guest is the happy path. When the
 * identity already belongs to another Pull Up user it asks before
 * switching, because the guest's logged work stays with the guest. Either
 * way the account ends up with a name: the provider's if it gave one,
 * otherwise a prompt.
 */
export function useSignIn() {
  const session = useSession();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

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

  async function signIn(provider: SignInProvider) {
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
              const guestId = session.user.id;
              result
                .switchAccount()
                .then(async (userId) => {
                  haptics.success();
                  // The app remounts as the other user; only a provider name
                  // is seeded here — an existing name is never overwritten.
                  // A sticker taken as the guest goes with them.
                  if (result.suggestedName != null) await nameAccount(userId, result.suggestedName);
                  await adoptSticker(guestId, userId, queryClient);
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

  return { busy, signIn };
}
