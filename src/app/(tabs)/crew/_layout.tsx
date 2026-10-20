import { Stack } from 'expo-router';
import { nativeHeader } from '@/styles/header';
import { useThemedStyles } from '@/styles/use-theme';

const INDEX_OPTIONS = { title: 'Crew' } as const;

/** A stack of one, purely so the tab gets the app's header (see
 * `styles/header.ts`) — a bare tab screen can't have a native bar. */
export default function CrewStackLayout() {
  const header = useThemedStyles(nativeHeader);
  return (
    <Stack screenOptions={header}>
      <Stack.Screen name="index" options={INDEX_OPTIONS} />
    </Stack>
  );
}
