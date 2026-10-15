import * as Haptics from 'expo-haptics';

/**
 * The app's haptic vocabulary. Call these by meaning, never `expo-haptics`
 * directly, so the same kind of moment always feels the same.
 *
 * Weight follows consequence, lightest first:
 * - `select`: a value or view changed — week pill, set type, date, popover.
 * - `tap`: a secondary action did something — add a set, open the timer,
 *   copy last time's numbers, adjust rest, minimise.
 * - `complete`: a set ticked off. Crisp, because it's the beat of the
 *   session and fires dozens of times.
 * - `commit`: a heavyweight step — start a session, press Finish, delete.
 * - `success`: the session or a rest is done.
 * - `warning`: something is about to be thrown away (the discard prompt).
 *
 * Fire after any guard, so feedback never marks a no-op. All are
 * fire-and-forget; a device without a Taptic Engine just ignores them.
 */
export const haptics = {
  select: () => void Haptics.selectionAsync(),
  tap: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  complete: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid),
  commit: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  success: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  /** One soft knock per second in the last seconds of a rest. */
  countdown: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft),
};
