import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth';
import { fetchProfile, saveDisplayName } from './api';
import type { SignInProvider } from './sign-in';

export function useProfile() {
  const session = useSession();
  return useQuery({
    queryKey: ['profile', session.user.id],
    queryFn: () => fetchProfile(session.user.id),
    // Guests have no profile row; don't ask.
    enabled: !session.user.is_anonymous,
  });
}

export function useSaveDisplayName() {
  const session = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (displayName: string) => saveDisplayName(session.user.id, displayName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] }),
  });
}

/** Which provider a permanent account signs in with; null for a guest. */
export function useSignInProvider(): SignInProvider | null {
  const session = useSession();
  if (session.user.is_anonymous) return null;
  const identity = session.user.identities?.find((i) => i.provider === 'apple' || i.provider === 'google');
  return (identity?.provider as SignInProvider | undefined) ?? null;
}
