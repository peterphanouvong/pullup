import { useEffect } from 'react';
import { router } from 'expo-router';
import { useSession } from '@/lib/auth';
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
  const isGuest = session.user.is_anonymous ?? false;

  useEffect(() => {
    if (!isGuest) router.replace('/onboarding/reveal');
  }, [isGuest]);

  return (
    <StepFrame
      progress={null}
      title="Save your programme"
      subtitle="Sign in so it’s yours on any phone, and so your mates can find you."
      cta="Show me the programme"
      onCta={() => router.replace('/onboarding/reveal')}
    >
      <AccountCard />
    </StepFrame>
  );
}
