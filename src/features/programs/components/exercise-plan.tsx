import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { SectionLabel } from '@/components/ui/section-label';
import type { DayExercise } from '../types';

/**
 * One prescribed exercise on the workout preview, Hevy-style: the name in
 * the accent, any coaching note under it, then a SET / LOAD / REPS table
 * with a row per planned set. No card: the rows sit straight on the canvas,
 * with every other one washed so the eye can track across.
 *
 * A prescription without a set count (a timed finisher, "AMRAP", a note
 * only) has nothing to tabulate, so it falls back to a single line.
 */
export function ExercisePlan({ exercise }: { exercise: DayExercise }) {
  const styles = useThemedStyles(createStyles);
  const rows = exercise.sets != null && exercise.sets > 0 ? Array.from({ length: exercise.sets }, (_, i) => i + 1) : [];
  const fallback = [exercise.reps, exercise.load].filter((x) => x != null).join(' · ');

  return (
    <View style={styles.block}>
      <Text style={styles.name}>{exercise.exerciseName}</Text>
      {exercise.notes != null && <Text style={styles.notes}>{exercise.notes}</Text>}

      {rows.length > 0 ? (
        <View>
          <View style={styles.row}>
            <SectionLabel style={styles.setCell}>Set</SectionLabel>
            <SectionLabel style={styles.cell}>Load</SectionLabel>
            <SectionLabel style={styles.cell}>Reps</SectionLabel>
          </View>
          {rows.map((n) => (
            <View key={n} style={[styles.row, n % 2 === 0 && styles.rowAlt]}>
              <Text style={[styles.setCell, styles.setNumber]}>{n}</Text>
              <Text style={[styles.cell, styles.value]}>{exercise.load ?? '—'}</Text>
              <Text style={[styles.cell, styles.value]}>{exercise.reps ?? '—'}</Text>
            </View>
          ))}
        </View>
      ) : fallback.length > 0 ? (
        <Text style={styles.fallback}>{fallback}</Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  block: { gap: theme.spacing.sm },
  name: { ...theme.type.heading, color: theme.colors.accent },
  notes: { ...theme.type.caption, color: theme.colors.inkMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.md,
  },
  rowAlt: { backgroundColor: theme.colors.glassControl },
  setCell: { width: 48, textAlign: 'center' },
  cell: { flex: 1, textAlign: 'center' },
  setNumber: { ...theme.type.heading, color: theme.colors.ink },
  value: { ...theme.type.body, color: theme.colors.ink },
  fallback: { ...theme.type.body, color: theme.colors.ink },
});
