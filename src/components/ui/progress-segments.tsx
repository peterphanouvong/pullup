import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

/** Nike-style week progress: one segment per planned session, filled when
 * done, with a "Workouts completed: X of N" caption. Renders nothing when
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
  segmentFilled: { backgroundColor: theme.colors.done },
  caption: { ...theme.type.caption, color: theme.colors.inkMuted },
});
