import { useSegments } from 'expo-router';
import { useTheme } from '@/styles/use-theme';
import { useActiveWorkout } from '../hooks';
import { MINIMIZED_BAR_CLEARANCE, MinimizedWorkoutBar } from './minimized-workout-bar';

/** Route groups the pill stays off: the live workout itself (and its save
 * and finish screens), where it would only point at the screen you're
 * already on, and the interview, which covers the app. */
const HIDDEN_ON = new Set(['workout', 'onboarding']);

/**
 * The live workout's pill, app-wide: while a session is running it floats
 * over whichever screen you're on, so the way back into it is always one
 * tap. Mounted once at the root, above the navigator.
 *
 * Hidden by route rather than by trusting modal layering: the workout is
 * a full-screen modal, but the overlay is a sibling of the navigator and
 * has shown through. The bar sits higher inside the tabs, clearing the
 * tab bar.
 */
export function LiveWorkoutOverlay() {
  const theme = useTheme();
  const workout = useActiveWorkout();
  const segments = useSegments();
  if (workout == null) return null;
  const first = segments[0] as string | undefined;
  if (first != null && HIDDEN_ON.has(first)) return null;
  const inTabs = first === '(tabs)';
  return <MinimizedWorkoutBar workout={workout} clearance={inTabs ? MINIMIZED_BAR_CLEARANCE : theme.spacing.md} />;
}
