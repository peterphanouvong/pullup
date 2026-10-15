import { StyleSheet, View } from 'react-native';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

/** Nike-style week progress: one segment per planned session, filled (and
 * glowing) when done. No caption: the segments already say "X of N", and a
 * spelled-out line under them read as filler. The count is still there for
 * VoiceOver. Renders nothing when the week has no sessions to count. */
export function ProgressSegments({ total, filled }: { total: number; filled: number }) {
  const styles = useThemedStyles(createStyles);
  if (total <= 0) return null;

  return (
    <View
      style={styles.track}
      accessible
      accessibilityLabel={`Workouts completed: ${filled} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.segment, i < filled && styles.segmentFilled]} />
      ))}
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  track: { flexDirection: 'row', gap: theme.spacing.xs },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.border,
  },
  // Completed sessions glow: the blue halo, tightened for a 4pt bar so it
  // reads as light coming off the segment rather than a haze around it.
  segmentFilled: {
    backgroundColor: theme.colors.done,
    ...theme.shadow.glow,
    shadowRadius: 6,
    shadowOpacity: 0.9,
  },
});
