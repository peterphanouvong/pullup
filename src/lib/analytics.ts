import PostHog from 'posthog-react-native';

/**
 * Product analytics, as one small choke point.
 *
 * Nothing is sent unless `EXPO_PUBLIC_POSTHOG_KEY` is set: with no key the
 * client is never constructed and every call here is a no-op, which is what
 * keeps tests (and anyone cloning the repo without secrets) quiet. The host
 * matters — a key from an EU project will silently drop events posted to the
 * US ingest endpoint.
 *
 * Event names are a closed union on purpose. A typo'd event name doesn't
 * fail, it just creates a second, near-identical row in PostHog that nobody
 * notices for a month.
 */
/** JSON scalars only. PostHog flattens anything else into a string you
 * can't filter on, so nesting an object here is a silent own goal. The type
 * is declared locally rather than imported: the SDK re-exports it only from
 * `@posthog/core`, a transitive dependency we shouldn't reach into. */
export type AnalyticsProperties = Record<string, string | number | boolean | null>;

export type AnalyticsEvent =
  | 'workout_started'
  | 'workout_finished'
  | 'workout_discarded'
  | 'programme_generated'
  | 'programme_selected'
  | 'programme_day_edited'
  | 'crew_created'
  | 'crew_joined'
  | 'crew_invite_shared'
  | 'session_shared';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST;

if (__DEV__ && !apiKey) {
  console.error(
    'EXPO_PUBLIC_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once EXPO_PUBLIC_POSTHOG_KEY is configured',
  );
}

if (__DEV__ && !host) {
  console.error(
    'EXPO_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once EXPO_PUBLIC_POSTHOG_HOST is configured',
  );
}

/** The live client, or null when its build-time configuration is missing.
 * Exported for the provider; everything else should go through the helpers
 * below. */
export const posthog: PostHog | null = apiKey && host
  ? new PostHog(apiKey, {
      host,
      // Lifecycle events (installed / opened / backgrounded) come free and
      // are the cheapest retention signal there is.
      captureAppLifecycleEvents: true,
      // One global SDK handler reports errors that escape application code.
      // Console output is intentionally excluded: it is not a monitoring signal.
      errorTracking: {
        autocapture: {
          uncaughtExceptions: true,
          unhandledRejections: true,
          console: [],
        },
      },
    })
  : null;

/** True when analytics is configured — worth checking before building an
 * expensive property bag. */
export const analyticsEnabled = posthog != null;

export function capture(event: AnalyticsEvent, properties?: AnalyticsProperties): void {
  posthog?.capture(event, properties);
}

/** Ties events to the signed-in user. Guests get an anonymous id from the
 * SDK, and upgrading a guest keeps the same Supabase user id, so the history
 * carries across sign-in rather than splitting in two. */
export function identify(userId: string, properties?: AnalyticsProperties): void {
  posthog?.identify(userId, properties);
}

/** Signing out: stop attributing to that person without losing the queue. */
export function resetIdentity(): void {
  posthog?.reset();
}

/** `$screen` is PostHog's canonical mobile pageview. Captured explicitly
 * from the router's pathname rather than through the SDK's autocapture: the
 * route tree is ours and the pathname is exactly the name we want. */
export function captureScreen(name: string): void {
  posthog?.screen(name);
}
