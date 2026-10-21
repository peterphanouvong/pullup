import { Stack } from 'expo-router';

const OPTIONS = { headerShown: false } as const;

/** The interview runs in its own stack with no native bar: each step
 * draws its own chevron and progress (see StepFrame). */
export default function OnboardingLayout() {
  return <Stack screenOptions={OPTIONS} />;
}
