import { router } from 'expo-router';
import { useSession } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { StepFrame } from '@/features/onboarding/components/step-frame';
import { useMarkOnboarded } from '@/features/onboarding/gate';
import { resetOnboarding } from '@/features/onboarding/state';

/**
 * First launch. One line and one button; browsing the catalogue instead
 * is the quiet alternative, and counts as done so this screen doesn't
 * come back.
 */
export default function WelcomeScreen() {
  const session = useSession();
  const markOnboarded = useMarkOnboarded(session.user.id);

  function start() {
    haptics.tap();
    resetOnboarding();
    router.push('/onboarding/1');
  }

  async function browse() {
    haptics.tap();
    await markOnboarded();
    router.dismissAll();
    router.push('/plan');
  }

  return (
    <StepFrame
      step={null}
      title="Let’s build your program"
      cta="Get started"
      onCta={start}
      secondary="Browse programs instead"
      onSecondary={() => void browse()}
    />
  );
}
