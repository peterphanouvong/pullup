import { StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/card';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

/** Placeholder exercise cards shown while the workout screen's real content
 * is deferred past the modal's open animation. Mirrors the real card's
 * shape (title, metrics line, a few set rows) so the swap doesn't jump. */
export function WorkoutSkeleton({ exerciseCount }: { exerciseCount: number }) {
  const styles = useThemedStyles(createStyles);
  // Always show something, and never more than fits the first screenful.
  const cards = Math.min(Math.max(exerciseCount, 1), 3);

  return (
    <View style={styles.container}>
      {Array.from({ length: cards }, (_, cardIndex) => (
        <Card key={cardIndex} glass={false} style={styles.card}>
          <View style={[styles.bar, styles.title]} />
          <View style={[styles.bar, styles.metrics]} />
          {Array.from({ length: 3 }, (_, rowIndex) => (
            <View key={rowIndex} style={[styles.bar, styles.row]} />
          ))}
        </Card>
      ))}
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { padding: theme.spacing.lg, gap: theme.spacing.md },
  card: { gap: theme.spacing.sm },
  bar: { backgroundColor: theme.colors.border, borderRadius: theme.radii.sm },
  title: { height: 18, width: '60%' },
  metrics: { height: 12, width: '35%' },
  row: { height: 32, width: '100%' },
});
