import { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Card } from '@/components/ui/card';
import { NativeButton } from '@/components/ui/native-button';
import { IconCircle } from '@/components/ui/icon-circle';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { addSet, updateExerciseNotes, type WorkoutExerciseWithSets } from '../hooks';
import { openExerciseMenu, openRestTimerSheet } from './exercise-menu';
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

export function ExerciseCard({
  exercise,
  workoutId,
  canMoveUp,
  canMoveDown,
}: {
  exercise: WorkoutExerciseWithSets;
  workoutId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isDuration = isDurationExercise(exercise);
  const doneCount = exercise.sets.filter((s) => s.completed_at != null).length;
  const notesRef = useRef<TextInput>(null);
  // What the programme asked for — "4 × 2 @ 85%", or whatever its LOAD
  // column said ("RPE 7", "moderate"). That's the thing you're deciding
  // against when you pick a weight, so it reads at a glance above the
  // table rather than sitting behind a tap. Sets added by hand carry no
  // target, hence the search for the first that has one.
  const prescription = exercise.sets.find((s) => s.target != null)?.target ?? null;

  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.name}>{exercise.exercise_name}</Text>
        <IconCircle
          name="ellipsis"
          fallback="⋯"
          size={28}
          onPress={() =>
            openExerciseMenu({
              workoutId,
              exercise,
              canMoveUp,
              canMoveDown,
              onAddNote: () => notesRef.current?.focus(),
            })
          }
        />
      </View>

      {/* At-a-glance metrics, same language as the Today week cards: icon +
          number, with rest as a tappable chip rather than a prose line. */}
      <View style={styles.metrics}>
        {prescription != null && (
          <View style={styles.metric}>
            <SymbolView name="target" size={12} tintColor={theme.colors.accent} />
            <Text style={[styles.metricText, styles.prescription]}>{prescription}</Text>
          </View>
        )}
        <View style={styles.metric}>
          <SymbolView name="square.stack.3d.up.fill" size={12} tintColor={theme.colors.inkMuted} />
          <Text style={styles.metricText}>{`${doneCount}/${exercise.sets.length} sets`}</Text>
        </View>
        <Pressable style={styles.metric} onPress={() => openRestTimerSheet(exercise.id)} hitSlop={6}>
          <SymbolView name="timer" size={12} tintColor={theme.colors.inkMuted} />
          <Text style={styles.metricText}>{formatRestTimer(exercise.rest_seconds)}</Text>
        </Pressable>
      </View>

      <TextInput
        ref={notesRef}
        style={styles.notes}
        placeholder="Add notes here…"
        placeholderTextColor={theme.colors.inkMuted}
        value={exercise.notes ?? ''}
        onChangeText={(text) => updateExerciseNotes(exercise.id, text)}
        multiline
      />

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
          exerciseName={exercise.exercise_name}
          workoutId={workoutId}
          isDuration={isDuration}
        />
      ))}

      <NativeButton label="Add Set" systemImage="plus" variant="tonal" onPress={() => addSet(exercise.id)} />
    </Card>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  card: { gap: theme.spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  name: { ...theme.type.heading, color: theme.colors.accent, flex: 1 },
  notes: { ...theme.type.body, color: theme.colors.ink, paddingVertical: theme.spacing.xs },
  metrics: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.md },
  metric: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  metricText: { ...theme.type.caption, color: theme.colors.inkMuted, fontVariant: ['tabular-nums'] },
  // The one metric that's an instruction rather than a reading, so it
  // carries the accent the exercise name does.
  prescription: { color: theme.colors.accent },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.xs },
  headerLabel: { ...theme.type.label, color: theme.colors.inkMuted },
  headerPrevious: { flex: 1 },
});
