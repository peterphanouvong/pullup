import { router } from 'expo-router';

/**
 * Out of the interview and into the app.
 *
 * The onboarding screens live in their own Stack (see app/onboarding/
 * _layout), pushed over the tabs by the root Stack. `router.dismissAll()`
 * is a plain pop-to-top, and the focused navigator handles it: from the
 * crew step that is the onboarding stack, whose first screen is the
 * welcome screen. Finishing the interview sent people straight back to
 * "Welcome to Pull Up", with no way through.
 *
 * `dismissTo` resolves its target against the whole tree and pops the
 * navigator where the current route and the target diverge: the root
 * Stack, which drops the onboarding route and lands on the tabs.
 */
export function leaveOnboarding(): void {
  router.dismissTo('/');
}
