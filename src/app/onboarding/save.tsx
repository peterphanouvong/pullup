import { useEffect } from 'react';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth';
import { seedDisplayName } from '@/features/account/api';
import { draft$ } from '@/features/onboarding/state';
import { AccountCard } from '@/features/account/components/account-card';
import { StepFrame } from '@/features/onboarding/components/step-frame';

/**
 * Sign in, asked the moment there's something worth keeping: the
 * programme is written and about to be shown. Cal AI's "save your plan"
 * beat. Skippable, and the Crew tab makes the same offer later.
 *
 * The account card does the linking; once the session is no longer a
 * guest this screen is done.
 */
export default function SaveScreen() {
  const session = useSession();
  const queryClient = useQueryClient();
  const isGuest = session.user.is_anonymous ?? false;

  useEffect(() => {
    if (isGuest) return;
    // Signed in just now: the name they gave us is their crew name, unless
    // the account already had one.
    const name = draft$.name.peek();
    if (name) {
      void seedDisplayName(session.user.id, name).then(() =>
        queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] }),
      );
    }
    router.replace('/onboarding/reveal');
  }, [isGuest, session.user.id, queryClient]);

  return (
    <StepFrame
      step={null}
      title="Save your program"
      subtitle="Sign in so it’s yours on any phone, and so your crew can find you."
      cta="Show me the program"
      onCta={() => router.replace('/onboarding/reveal')}
    >
      <AccountCard />
    </StepFrame>
  );
}
