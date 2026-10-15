import { useTheme } from "@/styles/use-theme";
import { Stack } from "expo-router";
import { Text } from "react-native";

/** The Today tab is its own native stack purely for the Apple-native header:
 * a compact bold "Today" sharing one bar row with the gear button. The title
 * renders via headerLeft because iOS always centers the native title slot
 * (headerTitleAlign is Android-only in react-native-screens). */
export default function TodayStackLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        title: "Today",
        // Suppress the centered native title slot — the headerLeft text IS
        // the title (iOS can't left-align the native slot).
        headerTitle: "",
        headerLeft: () => (
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: theme.colors.ink,
            }}
          >
            Today
          </Text>
        ),
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
