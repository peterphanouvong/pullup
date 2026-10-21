import { Stack } from 'expo-router';
import { nativeHeader } from '@/styles/header';
import { useThemedStyles } from '@/styles/use-theme';

/** The interview runs in its own stack under the app's one native bar:
 * the system back chevron is the way back, and screens that can't be
 * backed out of (building) say so themselves. */
export default function OnboardingLayout() {
  // No titles: the question is the title, and the bar shouldn't repeat it
  // (or, worse, show the route's file name).
  const options = useThemedStyles(untitled);
  return <Stack screenOptions={options} />;
}

const untitled = (theme: Parameters<typeof nativeHeader>[0]) => ({ ...nativeHeader(theme), title: '' });
