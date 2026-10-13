import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { AuthGate } from '@/lib/auth';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <Stack>
          <Stack.Screen name="index" options={{ title: 'Pull Up' }} />
        </Stack>
      </AuthGate>
    </QueryClientProvider>
  );
}
