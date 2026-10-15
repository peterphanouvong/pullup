import { Stack } from "expo-router";
import { useTheme } from "@/styles/use-theme";

/** The Today tab is its own native stack for the Apple-native header: a
 * compact "Today" title sharing the bar row with the gear button. (Large
 * title deliberately not used — its collapse behaviour wasn't worth the
 * trouble.) */
export default function TodayStackLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        title: "Today",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.colors.canvas },
        headerTintColor: theme.colors.ink,
      }}
    />
  );
}
