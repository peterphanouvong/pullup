import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { TurboModuleRegistry } from 'react-native';
import type { SignInWithIdTokenCredentials } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { unregisterPush } from '@/features/notifications/push';

/**
 * Upgrading a guest to a real account.
 *
 * Everyone starts signed in anonymously. Signing in with Apple or Google
 * *links* that identity onto the guest's own user, so the id — and every
 * workout keyed to it — stays the same. Nothing is copied or migrated.
 *
 * The one fork: the Apple ID / Google account already belongs to another
 * Pull Up user (a reinstall, a second phone). Linking fails, and the caller
 * decides whether to switch to that account instead.
 */

export type SignInProvider = 'apple' | 'google';

export type SignInResult =
  /** The guest is now this account. `suggestedName` is what the provider
   * told us, if anything — Apple only sends a name the very first time. */
  | { kind: 'linked'; suggestedName: string | null }
  /** The identity belongs to another user. `switchAccount` signs in as
   * them (leaving the guest behind) and resolves to their user id. */
  | { kind: 'exists'; suggestedName: string | null; switchAccount: () => Promise<string> }
  | { kind: 'cancelled' };

interface ProviderToken {
  credentials: SignInWithIdTokenCredentials;
  name: string | null;
}

const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

/** Google needs both client IDs and its native module in this build (plus
 * the URL scheme, which app.config.ts only adds once the iOS ID is set). */
export const googleSignInAvailable =
  Boolean(GOOGLE_IOS_CLIENT_ID && GOOGLE_WEB_CLIENT_ID) && TurboModuleRegistry.get('RNGoogleSignin') != null;

type GoogleModule = typeof import('@react-native-google-signin/google-signin');

/** Loaded on first use, never at import: the library looks up its native
 * module eagerly and throws when the build lacks it, which took the whole
 * Profile route down with it. */
function loadGoogle(): GoogleModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- deliberately lazy, see above
  return require('@react-native-google-signin/google-signin') as GoogleModule;
}

let googleConfigured = false;

async function appleToken(): Promise<ProviderToken | null> {
  // Apple signs the SHA-256 of the nonce into the token; Supabase is given
  // the raw value and checks the two match, so a stolen token can't be
  // replayed against us.
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) throw new Error('Apple didn’t return an identity token.');
    return {
      credentials: { provider: 'apple', token: credential.identityToken, nonce: rawNonce },
      name: credential.fullName?.givenName ?? null,
    };
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    throw e;
  }
}

async function googleToken(): Promise<ProviderToken | null> {
  const { GoogleSignin, isSuccessResponse, statusCodes } = loadGoogle();
  if (!googleConfigured) {
    GoogleSignin.configure({ iosClientId: GOOGLE_IOS_CLIENT_ID, webClientId: GOOGLE_WEB_CLIENT_ID });
    googleConfigured = true;
  }
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;
    const { idToken, user } = response.data;
    if (!idToken) throw new Error('Google didn’t return an ID token.');
    return {
      credentials: { provider: 'google', token: idToken },
      name: user.givenName ?? user.name ?? null,
    };
  } catch (e) {
    if ((e as { code?: string }).code === statusCodes.SIGN_IN_CANCELLED) return null;
    throw e;
  }
}

/** Runs the provider's native sheet, then links the result onto the
 * current (guest) user. Throws on anything other than cancel / conflict. */
export async function signInWith(provider: SignInProvider): Promise<SignInResult> {
  const token = provider === 'apple' ? await appleToken() : await googleToken();
  if (token == null) return { kind: 'cancelled' };

  const { error } = await supabase.auth.linkIdentity(token.credentials);
  if (!error) return { kind: 'linked', suggestedName: token.name };

  if (error.code === 'identity_already_exists') {
    return {
      kind: 'exists',
      suggestedName: token.name,
      switchAccount: async () => {
        const { data, error: signInError } = await supabase.auth.signInWithIdToken(token.credentials);
        if (signInError) throw signInError;
        return data.user.id;
      },
    };
  }
  throw error;
}

/** Back to a fresh guest. The auth gate sees the session end and signs in
 * anonymously; the account's workouts stay with the account. */
export async function signOut(): Promise<void> {
  // This phone must stop receiving the account's pushes first.
  await unregisterPush().catch(() => {});
  if (googleConfigured) await loadGoogle().GoogleSignin.signOut().catch(() => {});
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
