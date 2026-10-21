import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Whether this user has been through (or past) onboarding on this phone.
 * Local, per user id: a fresh guest is a fresh start, and a reinstall
 * asks again, which is fine. Finishing the interview, or choosing to
 * browse instead, both count.
 */
const key = (userId: string) => `onboarding-done:${userId}`;

export async function markOnboarded(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key(userId), '1');
  } catch {
    // Storage unavailable: the gate shows onboarding again next launch,
    // which costs a tap, not data.
  }
}

async function readOnboarded(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key(userId))) === '1';
  } catch {
    return true;
  }
}

export function useOnboardingDone(userId: string) {
  return useQuery({ queryKey: ['onboarding-done', userId], queryFn: () => readOnboarded(userId), staleTime: Infinity });
}

export function useMarkOnboarded(userId: string) {
  const queryClient = useQueryClient();
  return async () => {
    await markOnboarded(userId);
    queryClient.setQueryData(['onboarding-done', userId], true);
  };
}
