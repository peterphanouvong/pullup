import { Stack } from 'expo-router';
import { useTheme } from '@/styles/use-theme';

/** The Today tab is its own native stack purely for the Apple-native header:
 * a compact "Today" title sharing one bar row with the gear button (UIKit
 * renders large titles on their own row below the buttons, which wasted ~50pt
 * — Peter wants the name and the settings button in line). */
export default function TodayStackLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        title: 'Today',
        // No explicit headerBlurEffect: on iOS 26 the system's scroll-edge
        // effect already gives the bar its glass treatment, and setting both
        // makes RNScreens warn about overlapping effects.
        headerTransparent: true,
        headerShadowVisible: false,
        headerTintColor: theme.colors.ink,
      }}
    />
  );
}
