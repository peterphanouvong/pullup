import { Fragment, type ReactNode } from 'react';
import { Appearance, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { AuthGate, useSession } from '@/lib/auth';
import { nativeHeader } from '@/styles/header';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { initWorkoutStore } from '@/features/workouts/store';
import { loadVibes } from '@/features/backdrop/store';
import { WidgetSync } from '@/features/widgets/widget-sync';
import { PushGate } from '@/features/notifications/push-gate';
import { AvatarSync } from '@/features/sticker/hooks';
import { LiveWorkoutOverlay } from '@/features/workouts/components/live-workout-overlay';

// Pull Up is a dark-mode app. `userInterfaceStyle: "dark"` in app.json
// covers real builds, but Expo Go ignores it — overriding the scheme at
// runtime makes the native chrome (nav bars, tab bar, keyboards) go dark
// too, not just our own themed views.
Appearance.setColorScheme('dark');

// The page backdrops' saved dials (see features/backdrop): kicked off at
// startup so the first screens paint with the tuned look, not the defaults.
void loadVibes();

const queryClient = new QueryClient();

// Builds the workout-logging observables for the signed-in user before the
// rest of the tree (which may read them) renders. initWorkoutStore is
// idempotent, so re-renders of this gate don't recreate the sync machinery.
//
// Keyed on the user: switching accounts or signing out remounts the app
// against the new user's store, rather than leaving screens holding the
// old one. Upgrading a guest keeps the same id, so it remounts nothing.
function WorkoutStoreGate({ children }: { children: ReactNode }) {
  const session = useSession();
  initWorkoutStore(session.user.id);
  return (
    <Fragment key={session.user.id}>
      {children}
      <WidgetSync />
      <PushGate />
      <AvatarSync />
      {/* After the navigator, so it draws over every screen. */}
      <LiveWorkoutOverlay />
    </Fragment>
  );
}

// Module-level so their identity is stable: expo-router calls setOptions
// whenever an `options` prop changes identity, which re-configures the
// native bar.
const TABS_OPTIONS = { headerShown: false } as const;
const PLAN_OPTIONS = { title: 'Plan' } as const;
const ACTIVITIES_OPTIONS = { title: 'Activity' } as const;
const CALENDAR_OPTIONS = { title: 'Calendar' } as const;
const VIBE_LAB_OPTIONS = { title: 'Vibe lab' } as const;
const EXERCISES_OPTIONS = { title: 'Exercises' } as const;
// Fallbacks: these screens name themselves with Stack.Title once loaded.
const EXERCISE_OPTIONS = { title: 'Exercise' } as const;
const PERSON_OPTIONS = { title: 'Profile' } as const;
const PERSON_WORKOUT_OPTIONS = { title: 'Workout' } as const;
// The interview covers the app and can't be swiped away half-done; it
// draws its own chrome (see features/onboarding/components/step-frame).
const ONBOARDING_OPTIONS = { headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false } as const;

// The root view's own colour: everything under it remounts when the
// account changes (see WorkoutStoreGate), and for that frame or two this
// is all that's on screen. Unpainted it's white.
const rootStyle = (theme: Theme) =>
  StyleSheet.create({
    root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.colors.canvas },
  });

export default function RootLayout() {
  const header = useThemedStyles(nativeHeader);
  const styles = useThemedStyles(rootStyle);
  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          <WorkoutStoreGate>
            {/* One header style for the whole app (see `styles/header.ts`);
                a screen only names itself. Titles for the simple pushed
                screens are declared here so they're right even while the
                screen is still loading its data. */}
            <Stack screenOptions={header}>
              {/* Each tab runs its own stack, and owns its own bar. */}
              <Stack.Screen name="(tabs)" options={TABS_OPTIONS} />
              <Stack.Screen name="plan" options={PLAN_OPTIONS} />
              <Stack.Screen name="activities" options={ACTIVITIES_OPTIONS} />
              <Stack.Screen name="calendar" options={CALENDAR_OPTIONS} />
              <Stack.Screen name="vibe-lab" options={VIBE_LAB_OPTIONS} />
              <Stack.Screen name="stats/index" options={EXERCISES_OPTIONS} />
              <Stack.Screen name="stats/[key]" options={EXERCISE_OPTIONS} />
              <Stack.Screen name="person/[id]/index" options={PERSON_OPTIONS} />
              <Stack.Screen name="person/[id]/[workoutId]" options={PERSON_WORKOUT_OPTIONS} />
              <Stack.Screen name="onboarding" options={ONBOARDING_OPTIONS} />
            </Stack>
          </WorkoutStoreGate>
        </AuthGate>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
