import { useTheme } from "@/styles/use-theme";
import { Stack } from "expo-router";

/** The Today tab is its own native stack purely for the Apple-native header:
 * large "Today" title that collapses into the top bar on scroll.
 *
 * Deliberately NOT headerTransparent: pairing it with headerLargeTitle
 * severs the content-inset link UIKit uses to drive the collapse, so the
 * title never shrinks and scrolling fights the header ("hijacked" feel).
 * Without it the collapse is fully native, and iOS 26's scroll-edge effect
 * still gives the collapsed bar its glass treatment. */
export default function TodayStackLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        title: "Today",
        headerLargeTitleEnabled: true,
        headerShadowVisible: false,
        // Expanded-state (scroll-edge) background — matches the canvas so the
        // large-title area blends into the screen.
        headerLargeStyle: { backgroundColor: theme.colors.canvas },
        headerTintColor: theme.colors.ink,
      }}
    />
  );
}
