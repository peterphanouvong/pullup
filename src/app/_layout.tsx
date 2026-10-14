import '@/styles/unistyles'; // <-- must run before any StyleSheet.create() in this module graph
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { AuthGate, useSession } from '@/lib/auth';
import { initWorkoutStore } from '@/features/workouts/store';

const queryClient = new QueryClient();

// Builds the workout-logging observables for the signed-in user before the
// rest of the tree (which may read them) renders. initWorkoutStore is
// idempotent, so re-renders of this gate don't recreate the sync machinery.
function WorkoutStoreGate({ children }: { children: ReactNode }) {
  const session = useSession();
  initWorkoutStore(session.user.id);
  return children;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <WorkoutStoreGate>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </WorkoutStoreGate>
      </AuthGate>
    </QueryClientProvider>
  );
}
