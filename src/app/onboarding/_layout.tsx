import { Stack } from 'expo-router';
import { nativeHeader } from '@/styles/header';
import { useThemedStyles } from '@/styles/use-theme';

/** The interview runs in its own stack under the app's one native bar:
 * the system back chevron is the way back, and screens that can't be
 * backed out of (building) say so themselves. */
export default function OnboardingLayout() {
  const header = useThemedStyles(nativeHeader);
  return <Stack screenOptions={header} />;
}
