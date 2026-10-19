import { Fragment, type ReactNode } from 'react';
import { Appearance, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { AuthGate, useSession } from '@/lib/auth';
import { initWorkoutStore } from '@/features/workouts/store';
import { WidgetSync } from '@/features/widgets/widget-sync';

// Pull Up is a dark-mode app. `userInterfaceStyle: "dark"` in app.json
// covers real builds, but Expo Go ignores it — overriding the scheme at
// runtime makes the native chrome (nav bars, tab bar, keyboards) go dark
// too, not just our own themed views.
Appearance.setColorScheme('dark');

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
    </Fragment>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          <WorkoutStoreGate>
            {/* All screens draw their own chrome (ScreenTitle/BackRow) — the
                default navigation header (raw route names) is never wanted. */}
            <Stack screenOptions={{ headerShown: false }} />
          </WorkoutStoreGate>
        </AuthGate>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
