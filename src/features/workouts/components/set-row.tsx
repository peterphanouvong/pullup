import { useRef } from 'react';
import { use$ } from '@legendapp/state/react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { previousSet } from '../selectors';
import { workoutExercises$, workouts$, workoutSets$ } from '../store';
import type { WorkoutSet } from '../types';
import { completeSet, nextSetType, softDeleteSet, updateSet } from '../hooks';

/** Fixed column widths shared with ExerciseCard's header row, Hevy-style, so
 * header labels line up pixel-for-pixel with data cells (fix-round-1 finding
 * 2 — the earlier flex-ratio columns drifted out of alignment once cell
 * content/padding differed from the header's). PREVIOUS is the only
 * flexible column (`flex: 1`), applied directly where used rather than as a
 * named constant here.
 *
 * NB: none of these keys is named `value` — `exercise-card.tsx` and this
 * file used to write `{ flex: SET_TABLE_COLUMNS.value }` inline, and
 * `SET_TABLE_COLUMNS.value` is a bare `object.value` member expression.
 * `react-native-reanimated`'s Babel plugin (auto-injected by
 * `babel-preset-expo` whenever `react-native-reanimated` is a project
 * dependency, regardless of whether a file imports it — see
 * `react-native-worklets/plugin`'s `processPropertyValueForInlineStylesWarning`)
 * flags *any* inline `style` property whose value is syntactically
 * `<identifier>.value`, with no type information — it can't tell a plain
 * layout-constants object from an actual Reanimated shared value. That
 * purely-syntactic collision was the entire source of the "shared value's
 * .value inside reanimated inline style" console spam (fix-round-1 finding
 * 3): there is no real Reanimated usage anywhere in this tree. Renaming the
 * key away from `value` removes the warning at its root cause. */
export const SET_TABLE_COLUMNS = {
  set: 36,
  cell: 64,
  check: 44,
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
  // Guards against onPress also firing on the release that ends a long
  // press: Pressable doesn't suppress onPress just because onLongPress
  // already fired for the same gesture, so without this a long-press
  // delete would also cycle the (now soft-deleted) row's set type.
  const longPressFired = useRef(false);

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
      {/* Delete moved here (long-press) — fix-round-1 finding 1 — out of the
          way of the completion target it used to crowd. The dotted
          underline is a quiet, always-visible hint that this cell does more
          than tap-to-cycle. */}
      <Pressable
        style={[styles.setCell, { width: SET_TABLE_COLUMNS.set }]}
        onPress={() => {
          if (longPressFired.current) {
            longPressFired.current = false;
            return;
          }
          updateSet(set.id, { set_type: nextSetType(set.set_type) });
        }}
        onLongPress={() => {
          longPressFired.current = true;
          softDeleteSet(set.id);
        }}
      >
        <Text style={[styles.setNumber, { color: typeColor }]}>{setNumberLabel(siblingSets, set)}</Text>
        <View style={styles.deleteHint} />
      </Pressable>

      <Pressable style={styles.previousCell} onPress={copyGhost}>
        <Text style={styles.ghost} numberOfLines={1}>
          {formatGhost(previous, isDuration)}
        </Text>
      </Pressable>

      {isDuration ? (
        <TextInput
          style={[styles.input, { width: SET_TABLE_COLUMNS.cell * 2 }]}
          keyboardType="number-pad"
          placeholder="sec"
          placeholderTextColor={theme.colors.inkMuted}
          value={set.duration_seconds != null ? String(set.duration_seconds) : ''}
          onChangeText={(text) => updateSet(set.id, { duration_seconds: parseNumeric(text) })}
        />
      ) : (
        <>
          <TextInput
            style={[styles.input, { width: SET_TABLE_COLUMNS.cell }]}
            keyboardType="decimal-pad"
            placeholder="kg"
            placeholderTextColor={theme.colors.inkMuted}
            value={set.weight_kg != null ? String(set.weight_kg) : ''}
            onChangeText={(text) => updateSet(set.id, { weight_kg: parseNumeric(text) })}
          />
          <TextInput
            style={[styles.input, { width: SET_TABLE_COLUMNS.cell }]}
            keyboardType="number-pad"
            placeholder="reps"
            placeholderTextColor={theme.colors.inkMuted}
            value={set.reps != null ? String(set.reps) : ''}
            onChangeText={(text) => updateSet(set.id, { reps: parseNumeric(text) })}
          />
        </>
      )}

      {/* Rightmost element, a full 44x44pt hit target on its own (no
          hitSlop needed, and none added — hitSlop would stretch into the
          REPS input next to it and recreate the "two targets fighting over
          one tap" bug this was meant to fix). */}
      <Pressable
        style={[styles.checkCell, { width: SET_TABLE_COLUMNS.check }]}
        onPress={() => completeSet(set.id, new Date())}
      >
        <View style={[styles.checkbox, isCompleted && styles.checkboxDone]}>
          {isCompleted && <SymbolView name="checkmark" size={14} tintColor={theme.colors.onAccent} />}
        </View>
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
  setCell: { alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.xs },
  previousCell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.xs },
  checkCell: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumber: { ...theme.type.heading },
  deleteHint: {
    width: 14,
    marginTop: 3,
    borderBottomWidth: StyleSheet.hairlineWidth + 0.5,
    borderStyle: 'dotted',
    borderBottomColor: theme.colors.inkMuted,
  },
  ghost: { ...theme.type.body, color: theme.colors.inkMuted },
  input: {
    ...theme.type.body,
    color: theme.colors.ink,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    paddingVertical: theme.spacing.xs,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: theme.radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: theme.colors.done, borderColor: theme.colors.done },
});
