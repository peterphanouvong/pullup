import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';
import { signInWith } from '../sign-in';

jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));
jest.mock('expo-crypto', () => ({
  randomUUID: () => 'raw-nonce',
  digestStringAsync: jest.fn().mockResolvedValue('hashed-nonce'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn(), hasPlayServices: jest.fn(), signIn: jest.fn(), signOut: jest.fn() },
  isSuccessResponse: (r: { type: string }) => r.type === 'success',
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
}));
jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { linkIdentity: jest.fn(), signInWithIdToken: jest.fn(), signOut: jest.fn() } },
}));

const appleSignIn = AppleAuthentication.signInAsync as jest.Mock;
const linkIdentity = supabase.auth.linkIdentity as jest.Mock;
const signInWithIdToken = supabase.auth.signInWithIdToken as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  appleSignIn.mockResolvedValue({ identityToken: 'apple-token', fullName: { givenName: 'Sam' } });
});

describe('signInWith apple', () => {
  it('links the identity onto the guest, sending Apple the hashed nonce and Supabase the raw one', async () => {
    linkIdentity.mockResolvedValue({ error: null });
    const result = await signInWith('apple');
    expect(appleSignIn).toHaveBeenCalledWith(expect.objectContaining({ nonce: 'hashed-nonce' }));
    expect(linkIdentity).toHaveBeenCalledWith({ provider: 'apple', token: 'apple-token', nonce: 'raw-nonce' });
    expect(result).toEqual({ kind: 'linked', suggestedName: 'Sam' });
  });

  it('reports cancel without touching Supabase', async () => {
    appleSignIn.mockRejectedValue(Object.assign(new Error('cancelled'), { code: 'ERR_REQUEST_CANCELED' }));
    expect(await signInWith('apple')).toEqual({ kind: 'cancelled' });
    expect(linkIdentity).not.toHaveBeenCalled();
  });

  it('offers to switch when the Apple ID already has an account, and signs in only when asked', async () => {
    linkIdentity.mockResolvedValue({ error: { code: 'identity_already_exists', message: 'exists' } });
    signInWithIdToken.mockResolvedValue({ data: { user: { id: 'existing-user' } }, error: null });

    const result = await signInWith('apple');
    expect(result.kind).toBe('exists');
    expect(signInWithIdToken).not.toHaveBeenCalled();

    if (result.kind !== 'exists') throw new Error('unreachable');
    expect(await result.switchAccount()).toBe('existing-user');
    expect(signInWithIdToken).toHaveBeenCalledWith({ provider: 'apple', token: 'apple-token', nonce: 'raw-nonce' });
  });

  it('throws any other link failure', async () => {
    const failure = { code: 'unexpected_failure', message: 'nope' };
    linkIdentity.mockResolvedValue({ error: failure });
    await expect(signInWith('apple')).rejects.toBe(failure);
  });
});
