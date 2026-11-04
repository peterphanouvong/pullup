import { Stack } from 'expo-router';
import { nativeHeader } from '@/styles/header';
import { useThemedStyles } from '@/styles/use-theme';

const INDEX_OPTIONS = { title: 'Crew' } as const;
// Fallback: the screen names itself with Stack.Title once the crew loads.
const DETAIL_OPTIONS = { title: 'Crew' } as const;

/** The Crew tab's stack: the list of crews, and one crew in full, under
 * the app's header (see `styles/header.ts`). */
export default function CrewStackLayout() {
  const header = useThemedStyles(nativeHeader);
  return (
    <Stack screenOptions={header}>
      <Stack.Screen name="index" options={INDEX_OPTIONS} />
      <Stack.Screen name="[id]" options={DETAIL_OPTIONS} />
    </Stack>
  );
}
