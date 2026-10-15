import { use$ } from '@legendapp/state/react';
import { InputAccessoryView, StyleSheet, Text, TextInput, View } from 'react-native';
// Gesture-handler's Pressable: cancels its press when the row's delete
// swipe activates instead of firing on release.
import { Pressable } from 'react-native-gesture-handler';
import { NativeButton } from '@/components/ui/native-button';
import { SwipeToDelete } from '@/components/ui/swipe-to-delete';
import { SymbolView } from 'expo-symbols';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { useNumericField } from '../numeric-input';
import { previousSet } from '../selectors';
import { workoutExercises$, workouts$, workoutSets$ } from '../store';
import type { WorkoutSet } from '../types';
import * as Haptics from 'expo-haptics';
import { fillDownTargets } from '../edit';
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

type FillField = 'weight' | 'reps' | 'duration';

/** Names the column in the keyboard button's "Fill <column> down to N sets". */
const FIELD_LABELS: Record<FillField, string> = { weight: 'weight', reps: 'reps', duration: 'time' };

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

  // In-flight text for the three numeric inputs, independent of the store
  // except when it changes from elsewhere (e.g. copyGhost below) — see
  // numeric-input.ts for why: a fully store-controlled input eats the "."
  // or "," the user just typed on every re-render.
  const weightField = useNumericField(set.weight_kg, (value) => updateSet(set.id, { weight_kg: value }));
  const repsField = useNumericField(set.reps, (value) => updateSet(set.id, { reps: value }));
  const durationField = useNumericField(set.duration_seconds, (value) =>
    updateSet(set.id, { duration_seconds: value }),
  );

  const isCompleted = set.completed_at != null;
  // One accessory per FIELD, not per row: two inputs sharing a single
  // nativeID left the second one (reps) with no accessory at all.
  const accessoryId = (field: FillField) => `set-${set.id}-${field}`;
  const fillTargetCount = fillDownTargets(siblingSets, set.id).length;
  const typeColor =
    set.set_type === 'warmup' ? theme.colors.comp : set.set_type === 'drop' || set.set_type === 'failure'
      ? theme.colors.danger
      : theme.colors.ink;

  /** Copies the column being edited into every set below — a straight-sets
   * block at one weight, or one rep count. Only that column is touched, so
   * filling weight never overwrites reps already logged. */
  function fillDown(field: FillField) {
    const targets = fillDownTargets(siblingSets, set.id);
    if (targets.length === 0) return;
    const patch =
      field === 'duration'
        ? { duration_seconds: set.duration_seconds }
        : field === 'reps'
          ? { reps: set.reps }
          : { weight_kg: set.weight_kg };
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    for (const id of targets) updateSet(id, patch);
  }

  /** The floating "fill this column down" button shown above the keyboard
   * while that column's input has focus — a button, not a toolbar. */
  function renderFillAccessory(field: FillField) {
    return (
      <InputAccessoryView nativeID={accessoryId(field)} backgroundColor="transparent">
        {fillTargetCount > 0 ? (
          <View style={styles.accessory}>
            <NativeButton
              label={`Fill ${FIELD_LABELS[field]} down to ${fillTargetCount} set${
                fillTargetCount === 1 ? '' : 's'
              }`}
              onPress={() => fillDown(field)}
            />
          </View>
        ) : null}
      </InputAccessoryView>
    );
  }

  function handleComplete() {
    // Light tap on the way in, nothing on un-completing: the feedback marks
    // the achievement, not the toggle.
    if (set.completed_at == null) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    completeSet(set.id, new Date());
  }

  function copyGhost() {
    if (!previous) return;
    if (isDuration) {
      updateSet(set.id, { duration_seconds: previous.duration_seconds });
    } else {
      updateSet(set.id, { weight_kg: previous.weight_kg, reps: previous.reps });
    }
  }

  return (
    <>
    <SwipeToDelete onDelete={() => softDeleteSet(set.id)} childStyle={styles.swipeChild}>
    <View style={[styles.row, isCompleted && styles.rowCompleted]}>
      <Pressable
        style={[styles.setCell, { width: SET_TABLE_COLUMNS.set }]}
        onPress={() => updateSet(set.id, { set_type: nextSetType(set.set_type) })}
      >
        <Text style={[styles.setNumber, { color: typeColor }]}>{setNumberLabel(siblingSets, set)}</Text>
      </Pressable>

      <Pressable style={styles.previousCell} onPress={copyGhost}>
        <Text style={styles.ghost} numberOfLines={1}>
          {formatGhost(previous, isDuration)}
        </Text>
      </Pressable>

      {isDuration ? (
        <TextInput
          style={[styles.input, { width: SET_TABLE_COLUMNS.cell * 2 }]}
          inputAccessoryViewID={accessoryId('duration')}
          keyboardType="number-pad"
          placeholder="sec"
          placeholderTextColor={theme.colors.inkMuted}
          value={durationField.text}
          onChangeText={durationField.onChangeText}
        />
      ) : (
        <>
          <TextInput
            style={[styles.input, { width: SET_TABLE_COLUMNS.cell }]}
            inputAccessoryViewID={accessoryId('weight')}
            keyboardType="decimal-pad"
            placeholder="kg"
            placeholderTextColor={theme.colors.inkMuted}
            value={weightField.text}
            onChangeText={weightField.onChangeText}
          />
          <TextInput
            style={[styles.input, { width: SET_TABLE_COLUMNS.cell }]}
            inputAccessoryViewID={accessoryId('reps')}
            keyboardType="number-pad"
            placeholder="reps"
            placeholderTextColor={theme.colors.inkMuted}
            value={repsField.text}
            onChangeText={repsField.onChangeText}
          />
        </>
      )}

      {/* Rightmost element, a full 44x44pt hit target on its own (no
          hitSlop needed, and none added — hitSlop would stretch into the
          REPS input next to it and recreate the "two targets fighting over
          one tap" bug this was meant to fix). */}
      <Pressable
        style={[styles.checkCell, { width: SET_TABLE_COLUMNS.check }]}
        onPress={handleComplete}
      >
        <View style={[styles.checkbox, isCompleted && styles.checkboxDone]}>
          <SymbolView
            name="checkmark"
            size={17}
            tintColor={isCompleted ? theme.colors.onGradient : theme.colors.inkMuted}
          />
        </View>
      </Pressable>
    </View>
    </SwipeToDelete>
    {isDuration ? (
      renderFillAccessory('duration')
    ) : (
      <>
        {renderFillAccessory('weight')}
        {renderFillAccessory('reps')}
      </>
    )}
    </>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  // Matches the card it sits on (see theme.glassSolid) so the row has no
  // visible background of its own, while still hiding the swipe action.
  swipeChild: { backgroundColor: theme.colors.glassSolid, borderRadius: theme.radii.md },
  rowCompleted: { backgroundColor: theme.colors.doneRow },
  // Even inset all round: the same `sm` on every edge, so the checkbox sits
  // the same distance from the row's right edge as from its top and bottom.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.radii.md,
    gap: theme.spacing.xs,
  },
  setCell: { alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.xs },
  previousCell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.xs },
  // Stays centred so the checkbox lines up under the header's tick, and
  // stays 44pt wide so the tap target isn't shrunk (see the note at the
  // Pressable). The row's own inset supplies the gap to the card edge.
  checkCell: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Just the button floating above the keyboard — no toolbar bar behind it.
  accessory: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm },
  setNumber: { ...theme.type.heading },
  ghost: { ...theme.type.body, color: theme.colors.inkMuted },
  input: {
    ...theme.type.body,
    color: theme.colors.ink,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    paddingVertical: theme.spacing.xs,
  },
  // Always shows a checkmark: hollow and muted when pending, filled rose
  // when done. A completed set used to be signalled by tinting the whole
  // row, which read as a stray coloured rectangle.
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.md,
    borderWidth: 1.5,
    borderColor: theme.colors.inkMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: theme.colors.done, borderColor: theme.colors.done },
});
