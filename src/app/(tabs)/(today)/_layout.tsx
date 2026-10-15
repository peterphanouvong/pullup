import { Stack } from "expo-router";
import { useTheme } from "@/styles/use-theme";

/** The Today tab is its own native stack purely for the Apple-native header:
 * a large "Today" title that collapses into the bar on scroll.
 *
 * The title lives in `screenOptions` (not a `Stack.Title` under a
 * `Stack.Screen` in this layout — that reserved the large-title space but
 * rendered no text) and NOT as an `options` prop on the page: an inline
 * options object there changes identity every render, re-running
 * setOptions and resetting the collapse animation mid-scroll. Per-screen
 * chrome that needs page data is declared with Stack.Toolbar, which
 * memoizes its options. */
export default function TodayStackLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        title: "Today",
        headerLargeTitleEnabled: true,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        // Expanded-state background — matches the canvas so the large-title
        // area blends into the screen.
        headerLargeStyle: { backgroundColor: theme.colors.canvas },
        headerTintColor: theme.colors.ink,
        headerLargeTitleStyle: { color: theme.colors.ink },
      }}
    />
  );
}
