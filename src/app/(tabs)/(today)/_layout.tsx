import { Stack } from "expo-router";
import { useTheme } from "@/styles/use-theme";

/** The Today tab is its own native stack for the Apple-native header: a
 * compact "Today" title sharing the bar row with the gear button. (Large
 * title deliberately not used — its collapse behaviour wasn't worth the
 * trouble.)
 *
 * The bar is translucent: a blur effect (which implies headerTransparent)
 * rather than a solid fill, so content blurs under it as it scrolls. The
 * Dark variant is explicit because without one the bar falls back to the
 * light material and the title disappears into a white strip. */
export default function TodayStackLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        title: "Today",
        headerShadowVisible: false,
        headerTransparent: true,
        headerBlurEffect: 'systemChromeMaterialDark',
        headerTintColor: theme.colors.ink,
      }}
    />
  );
}
