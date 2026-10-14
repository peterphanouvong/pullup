import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Card } from '@/components/ui/card';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { addSet, updateExerciseNotes, type WorkoutExerciseWithSets } from '../hooks';
import { SET_TABLE_COLUMNS, SetRow } from './set-row';

// A fallback once a fresh exercise's sets are all still blank (no
// weight/reps/duration logged yet): look for a time-shaped token ("20 s",
// "30 s/side") in the programme-prescribed `target` ghost text composed by
// `buildWorkoutFromDay`'s `composeTarget`. Deliberately excludes bare "m"
// distances the same way `start.ts`'s own TIMED_PRESCRIPTION_RE does.
const TIMED_TARGET_RE = /\d+\s*s(?:\/side)?\b/i;

/**
 * Is this exercise's set table duration-based (TIME column) rather than
 * weighted (KG/REPS columns)? Detection order, cheapest/most-certain first:
 * 1. Any set already has `duration_seconds` logged -> duration.
 * 2. Any set already has `weight_kg` or `reps` logged -> weighted.
 * 3. Otherwise (a fresh, unlogged prefill) fall back to the `target` ghost
 *    text's shape, since `buildWorkoutFromDay` doesn't stamp a per-set
 *    duration-vs-weighted flag up front.
 */
function isDurationExercise(exercise: WorkoutExerciseWithSets): boolean {
  if (exercise.sets.some((s) => s.duration_seconds != null)) return true;
  if (exercise.sets.some((s) => s.weight_kg != null || s.reps != null)) return false;
  return exercise.sets.some((s) => s.target != null && TIMED_TARGET_RE.test(s.target));
}

function formatRestTimer(restSeconds: number | null): string {
  if (restSeconds == null) return 'OFF';
  const min = Math.floor(restSeconds / 60);
  const sec = restSeconds % 60;
  return sec > 0 ? `${min}min ${sec}s` : `${min}min`;
}

export function ExerciseCard({ exercise, workoutId }: { exercise: WorkoutExerciseWithSets; workoutId: string }) {
  const styles = useThemedStyles(createStyles);
  const isDuration = isDurationExercise(exercise);

  return (
    <Card style={styles.card}>
      <Text style={styles.name}>{exercise.exercise_name}</Text>

      <TextInput
        style={styles.notes}
        placeholder="Add notes here…"
        value={exercise.notes ?? ''}
        onChangeText={(text) => updateExerciseNotes(exercise.id, text)}
        multiline
      />

      <Text style={styles.restRow}>{`Rest Timer: ${formatRestTimer(exercise.rest_seconds)}`}</Text>

      <View style={styles.header}>
        <Text style={[styles.headerLabel, { width: SET_TABLE_COLUMNS.set, textAlign: 'center' }]}>SET</Text>
        <Text style={[styles.headerLabel, styles.headerPrevious]}>PREVIOUS</Text>
        {isDuration ? (
          <Text style={[styles.headerLabel, { width: SET_TABLE_COLUMNS.cell * 2, textAlign: 'center' }]}>TIME</Text>
        ) : (
          <>
            <Text style={[styles.headerLabel, { width: SET_TABLE_COLUMNS.cell, textAlign: 'center' }]}>KG</Text>
            <Text style={[styles.headerLabel, { width: SET_TABLE_COLUMNS.cell, textAlign: 'center' }]}>REPS</Text>
          </>
        )}
        <Text style={[styles.headerLabel, { width: SET_TABLE_COLUMNS.check, textAlign: 'center' }]}>✓</Text>
      </View>

      {exercise.sets.map((set) => (
        <SetRow
          key={set.id}
          set={set}
          siblingSets={exercise.sets}
          exerciseId={exercise.exercise_id}
          workoutId={workoutId}
          isDuration={isDuration}
        />
      ))}

      <Text style={styles.addSet} onPress={() => addSet(exercise.id)}>
        + Add Set
      </Text>
    </Card>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  card: { gap: theme.spacing.sm },
  name: { ...theme.type.heading, color: theme.colors.accent },
  notes: { ...theme.type.body, color: theme.colors.ink, paddingVertical: theme.spacing.xs },
  restRow: { ...theme.type.caption, color: theme.colors.inkMuted },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.xs },
  headerLabel: { ...theme.type.label, color: theme.colors.inkMuted },
  headerPrevious: { flex: 1 },
  addSet: {
    ...theme.type.heading,
    color: theme.colors.inkMuted,
    textAlign: 'center',
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
  },
});
