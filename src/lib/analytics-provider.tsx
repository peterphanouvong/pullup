import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'expo-router';
import { PostHogProvider } from 'posthog-react-native';
import { captureScreen, identify, posthog, posthogLogger } from './analytics';

/**
 * Wraps the app in the PostHog client and reports screens.
 *
 * With no `EXPO_PUBLIC_POSTHOG_KEY` there's no client, so this renders its
 * children untouched — the app runs identically with analytics switched off,
 * which is how it behaves in tests and for anyone without the env file.
 */
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    posthogLogger.info('mobile_analytics_initialized', { runtime: 'expo' });
  }, []);

  if (posthog == null) return <>{children}</>;
  return (
    <PostHogProvider
      client={posthog}
      // Expo Router owns screen names, so report those below rather than
      // letting autocapture derive duplicate routes. Touch autocapture and
      // session recording remain at their PostHog defaults.
      autocapture={{ captureScreens: false, captureTouches: true }}
    >
      <ScreenTracker />
      {children}
    </PostHogProvider>
  );
}

/** One `$screen` per route change, named by the router's own pathname
 * (`/workout/[id]`-shaped, so ids don't explode into thousands of distinct
 * screen names). Renders nothing. */
function ScreenTracker() {
  const pathname = usePathname();
  useEffect(() => {
    captureScreen(pathname);
  }, [pathname]);
  return null;
}

/** Attaches the signed-in user to everything that follows. Separate from the
 * provider because it needs the session, which lives inside the auth gate. */
export function useIdentifyUser(userId: string, isGuest: boolean) {
  useEffect(() => {
    identify(userId, { is_guest: isGuest });
    posthogLogger.info('mobile_identity_bound', { is_guest: isGuest });
  }, [userId, isGuest]);
}
