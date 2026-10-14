import { use$ } from '@legendapp/state/react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { previousSet } from '../selectors';
import { workoutExercises$, workouts$, workoutSets$ } from '../store';
import type { SetType, WorkoutSet } from '../types';
import { completeSet, nextSetType, softDeleteSet, updateSet } from '../hooks';

/** Column widths shared with ExerciseCard's header row so labels line up with
 * data cells. `value` is used twice (KG, REPS) for a weighted exercise, or
 * once at double width for a duration exercise's single TIME column. */
export const SET_TABLE_COLUMNS = {
  set: 0.9,
  previous: 1.7,
  value: 1,
  check: 0.8,
} as const;

/** Warm-ups show "W", drops "D", failures "F"; working sets are numbered 1..n
 * among the exercise's *other working sets*, in position order — matching
 * the design's "warm-ups show W, working sets number 1..n" rule. */
function setNumberLabel(siblingSets: WorkoutSet[], set: WorkoutSet): string {
  if (set.set_type === 'warmup') return 'W';
  if (set.set_type === 'drop') return 'D';
  if (set.set_type === 'failure') return 'F';
  const working = siblingSets.filter((s) => s.set_type === 'working').sort((a, b) => a.position - b.position);
  const index = working.findIndex((s) => s.id === set.id);
  return String(index + 1);
}

function formatGhost(set: WorkoutSet | null, isDuration: boolean): string {
  if (!set) return '—';
  if (isDuration) {
    return set.duration_seconds != null ? `${set.duration_seconds}s` : '—';
  }
  if (set.weight_kg != null && set.reps != null) return `${set.weight_kg} × ${set.reps}`;
  if (set.reps != null) return `${set.reps} reps`;
  return '—';
}

function parseNumeric(text: string): number | null {
  if (text.trim().length === 0) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

export function SetRow({
  set,
  siblingSets,
  exerciseId,
  workoutId,
  isDuration,
}: {
  set: WorkoutSet;
  siblingSets: WorkoutSet[];
  exerciseId: string | null;
  workoutId: string;
  isDuration: boolean;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const previous = use$(() => {
    if (!exerciseId) return null;
    return previousSet({
      exerciseId,
      position: set.position,
      currentWorkoutId: workoutId,
      workouts: workouts$.get() ?? {},
      workoutExercises: workoutExercises$.get() ?? {},
      sets: workoutSets$.get() ?? {},
    });
  });

  const isCompleted = set.completed_at != null;
  const typeColor =
    set.set_type === 'warmup' ? theme.colors.comp : set.set_type === 'drop' || set.set_type === 'failure'
      ? theme.colors.danger
      : theme.colors.ink;

  function copyGhost() {
    if (!previous) return;
    if (isDuration) {
      updateSet(set.id, { duration_seconds: previous.duration_seconds });
    } else {
      updateSet(set.id, { weight_kg: previous.weight_kg, reps: previous.reps });
    }
  }

  return (
    <View style={[styles.row, isCompleted && styles.rowCompleted]}>
      <Pressable
        style={[styles.cell, { flex: SET_TABLE_COLUMNS.set }]}
        onPress={() => updateSet(set.id, { set_type: nextSetType(set.set_type as SetType) })}
      >
        <Text style={[styles.setNumber, { color: typeColor }]}>{setNumberLabel(siblingSets, set)}</Text>
      </Pressable>

      <Pressable style={[styles.cell, { flex: SET_TABLE_COLUMNS.previous }]} onPress={copyGhost}>
        <Text style={styles.ghost} numberOfLines={1}>
          {formatGhost(previous, isDuration)}
        </Text>
      </Pressable>

      {isDuration ? (
        <TextInput
          style={[styles.input, { flex: SET_TABLE_COLUMNS.value * 2 }]}
          keyboardType="number-pad"
          placeholder="sec"
          placeholderTextColor={theme.colors.inkMuted}
          value={set.duration_seconds != null ? String(set.duration_seconds) : ''}
          onChangeText={(text) => updateSet(set.id, { duration_seconds: parseNumeric(text) })}
        />
      ) : (
        <>
          <TextInput
            style={[styles.input, { flex: SET_TABLE_COLUMNS.value }]}
            keyboardType="decimal-pad"
            placeholder="kg"
            placeholderTextColor={theme.colors.inkMuted}
            value={set.weight_kg != null ? String(set.weight_kg) : ''}
            onChangeText={(text) => updateSet(set.id, { weight_kg: parseNumeric(text) })}
          />
          <TextInput
            style={[styles.input, { flex: SET_TABLE_COLUMNS.value }]}
            keyboardType="number-pad"
            placeholder="reps"
            placeholderTextColor={theme.colors.inkMuted}
            value={set.reps != null ? String(set.reps) : ''}
            onChangeText={(text) => updateSet(set.id, { reps: parseNumeric(text) })}
          />
        </>
      )}

      <Pressable
        style={[styles.cell, styles.checkCell, { flex: SET_TABLE_COLUMNS.check }]}
        onPress={() => completeSet(set.id, new Date())}
      >
        <View style={[styles.checkbox, isCompleted && styles.checkboxDone]}>
          {isCompleted && <SymbolView name="checkmark" size={14} tintColor={theme.colors.onAccent} />}
        </View>
      </Pressable>

      {/* Trailing delete affordance (chosen over Swipeable for simplicity —
          see task-4-report.md): a small, always-visible icon button rather
          than a swipe gesture. */}
      <Pressable style={styles.deleteCell} onPress={() => softDeleteSet(set.id)} hitSlop={8}>
        <SymbolView name="minus.circle" size={16} tintColor={theme.colors.inkMuted} />
      </Pressable>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.sm,
    gap: theme.spacing.xs,
  },
  rowCompleted: { backgroundColor: theme.colors.doneSoft },
  cell: { alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.xs },
  checkCell: { flexGrow: 0 },
  setNumber: { ...theme.type.heading },
  ghost: { ...theme.type.body, color: theme.colors.inkMuted },
  input: {
    ...theme.type.body,
    color: theme.colors.ink,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    paddingVertical: theme.spacing.xs,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: theme.radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: theme.colors.done, borderColor: theme.colors.done },
  deleteCell: { paddingLeft: theme.spacing.xs, paddingVertical: theme.spacing.xs },
});
