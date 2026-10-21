import { Stack } from "expo-router";
import { nativeHeader } from "@/styles/header";
import { useThemedStyles } from "@/styles/use-theme";

const INDEX_OPTIONS = { title: "Program" } as const;

/** The Programme tab is its own native stack so it gets the app's header
 * (see `styles/header.ts`) — a tab screen on its own can't have one. */
export default function TodayStackLayout() {
  const header = useThemedStyles(nativeHeader);
  return (
    <Stack screenOptions={header}>
      <Stack.Screen name="index" options={INDEX_OPTIONS} />
    </Stack>
  );
}
