import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * `https://pullup.expo.app/join?c=K7Q2MX` — a crew invite opened from a
 * message. iOS hands the whole URL to the app (associated domain), so this
 * route stands in for the web page the link also serves.
 *
 * Same destination as the `pullup://join/CODE` form in `[code].tsx`: the
 * Crew tab, which asks whether to join. A redirect rather than a screen, so
 * the link never leaves a page of its own on the stack.
 */
export default function JoinQueryLink() {
  const { c } = useLocalSearchParams<{ c?: string }>();
  // No code (someone opened /join bare) — the tab's own + button is the
  // way in from there.
  if (!c) return <Redirect href="/crew" />;
  return <Redirect href={{ pathname: '/crew', params: { join: c } }} />;
}
