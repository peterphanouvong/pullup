import { Stack } from 'expo-router';
import { useTheme } from '@/styles/use-theme';

/** The Today tab is its own native stack purely for the Apple-native header:
 * large "Today" title that collapses into a translucent glass bar on scroll
 * (matching the native tab bar's material). */
export default function TodayStackLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        title: 'Today',
        headerLargeTitle: true,
        // No explicit headerBlurEffect: on iOS 26 the system's scroll-edge
        // effect already gives the collapsed bar its glass treatment, and
        // setting both makes RNScreens warn about overlapping effects.
        headerTransparent: true,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerLargeStyle: { backgroundColor: 'transparent' },
        headerTintColor: theme.colors.ink,
      }}
    />
  );
}
