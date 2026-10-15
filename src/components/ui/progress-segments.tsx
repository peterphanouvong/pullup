import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

/** Nike-style week progress: one segment per planned session, filled when
 * done (and glowing), with a "Workouts completed: X of N" caption. Renders nothing when
 * the week has no sessions to count. */
export function ProgressSegments({ total, filled }: { total: number; filled: number }) {
  const styles = useThemedStyles(createStyles);
  if (total <= 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.segment, i < filled && styles.segmentFilled]} />
        ))}
      </View>
      <Text style={styles.caption}>{`Workouts completed: ${filled} of ${total}`}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { gap: theme.spacing.sm },
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
  caption: { ...theme.type.caption, color: theme.colors.inkMuted },
});
