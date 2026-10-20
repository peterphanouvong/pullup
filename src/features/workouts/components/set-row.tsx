import { useEffect, useState } from 'react';
import { useSelector } from '@legendapp/state/react';
import { Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
// Gesture-handler's Pressable: cancels its press when the row's delete
// swipe activates instead of firing on release.
import { Pressable } from 'react-native-gesture-handler';
import { SwipeToDelete } from '@/components/ui/swipe-to-delete';
import { SymbolView } from 'expo-symbols';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { useNumericField } from '../numeric-input';
import { previousSet } from '../selectors';
import { workoutExercises$, workouts$, workoutSets$ } from '../store';
import type { WorkoutSet } from '../types';
import { haptics } from '@/lib/haptics';
import { fillFromPrevious } from '../edit';
import { blurSetField, focusSetField, type FillField } from '../focused-set';
import { startRestTimer } from '../rest-timer';
import { elapsedStopwatchSeconds, setStopwatch$, startSetStopwatch, stopSetStopwatch } from '../set-stopwatch';
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

/** One height for every control in a set row — set chip, inputs, checkbox. */
const SET_CHIP_HEIGHT = 36;

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
  if (set.weight_kg != null && set.reps != null) return `${set.weight_kg}kg × ${set.reps}`;
  if (set.weight_kg != null) return `${set.weight_kg}kg`;
  if (set.reps != null) return `${set.reps} reps`;
  return '—';
}

export function SetRow({
  set,
  siblingSets,
  exerciseId,
  exerciseName,
  workoutId,
  isDuration,
}: {
  set: WorkoutSet;
  siblingSets: WorkoutSet[];
  exerciseId: string | null;
  exerciseName: string;
  workoutId: string;
  isDuration: boolean;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  // Where this set sits in the exercise's order — what "the same set last
  // time" is matched on (stored positions keep gaps after deletes).
  const setIndex = siblingSets.findIndex((s) => s.id === set.id);

  const previous = useSelector(() => {
    if (setIndex < 0) return null;
    return previousSet({
      exerciseId,
      exerciseName,
      setIndex,
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

  // Which of this row's inputs has the keyboard, so the row can show an
  // active state while it's being edited.
  const [isEditing, setIsEditing] = useState(false);

  const isCompleted = set.completed_at != null;
  const typeColor =
    set.set_type === 'warmup' ? theme.colors.comp : set.set_type === 'drop' || set.set_type === 'failure'
      ? theme.colors.danger
      : theme.colors.ink;

  // This row's stopwatch, if it's the one running. The clock is real state
  // (see the React Compiler note in the style guide) and only ticks while
  // this row is being timed, so idle rows cost nothing.
  const stopwatch = useSelector(() => {
    const current = setStopwatch$.get();
    return current?.setId === set.id ? current : null;
  });
  // A stale `now` from before the start just clamps to 1s until the first
  // tick, which is what a fresh stopwatch should read anyway.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!stopwatch) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [stopwatch]);
  const isTiming = stopwatch != null;

  /** The play button beside a TIME cell. With a duration entered it runs
   * that hold as a countdown on the bar already used for rest. With the
   * cell empty it starts a stopwatch in the cell instead, and the same
   * button stops it and logs what it measured. */
  function handlePlay() {
    if (isTiming) {
      const measured = stopSetStopwatch();
      if (!measured) return;
      haptics.complete();
      updateSet(measured.setId, { duration_seconds: measured.seconds });
      return;
    }
    const seconds = set.duration_seconds;
    haptics.commit();
    if (seconds != null && seconds > 0) {
      startRestTimer(seconds);
      return;
    }
    // Another row's stopwatch gives way, keeping what it measured.
    const previousRun = stopSetStopwatch();
    if (previousRun) updateSet(previousRun.setId, { duration_seconds: previousRun.seconds });
    startSetStopwatch(set.id);
  }

  function handleFocus(field: FillField) {
    setIsEditing(true);
    focusSetField(set.id, field);
  }

  function handleBlur(field: FillField) {
    setIsEditing(false);
    blurSetField(set.id, field);
  }

  function handleComplete() {
    // Ticking a set ends editing it: drop the keyboard so the row reads as
    // done, not still being typed into.
    Keyboard.dismiss();
    if (set.completed_at == null) {
      // Empty inputs log what their placeholders showed: last time's lift.
      const borrowed = fillFromPrevious(set, previous);
      if (Object.keys(borrowed).length > 0) updateSet(set.id, borrowed);
      // A crisp knock on the way in: the beat of the session.
      haptics.complete();
    } else {
      // Undoing gets the lightest touch, so it's felt but not celebrated.
      haptics.select();
    }
    completeSet(set.id, new Date());
  }

  function copyGhost() {
    if (!previous) return;
    haptics.tap();
    if (isDuration) {
      updateSet(set.id, { duration_seconds: previous.duration_seconds });
    } else {
      updateSet(set.id, { weight_kg: previous.weight_kg, reps: previous.reps });
    }
  }

  return (
    <>
    <SwipeToDelete onDelete={() => softDeleteSet(set.id)} childStyle={styles.swipeChild}>
    <View style={[styles.row, isCompleted && styles.rowCompleted, isEditing && styles.rowEditing]}>
      <Pressable
        style={[styles.setCell, { width: SET_TABLE_COLUMNS.set }]}
        onPress={() => {
          haptics.select();
          updateSet(set.id, { set_type: nextSetType(set.set_type) });
        }}
      >
        <View style={[styles.chip, isCompleted && styles.chipDone]}>
          <Text style={[styles.setNumber, { color: typeColor }]}>{setNumberLabel(siblingSets, set)}</Text>
        </View>
      </Pressable>

      <Pressable style={styles.previousCell} onPress={copyGhost}>
        <Text style={styles.ghost} numberOfLines={1}>
          {formatGhost(previous, isDuration)}
        </Text>
      </Pressable>

      {isDuration ? (
        <>
          {/* Timed work (ISO holds, planks) is the one case where the number
              in the row is a thing to *run*, not just record, so the cell
              carries a play button. While the stopwatch runs the cell shows
              the live count and can't be typed into. */}
          <TextInput
            style={[
              styles.input,
              styles.durationInput,
              isCompleted ? styles.inputDone : styles.inputPending,
              isTiming && styles.inputTiming,
            ]}
            onFocus={() => handleFocus('duration')}
            onBlur={() => handleBlur('duration')}
            selectTextOnFocus
            editable={!isTiming}
            keyboardType="number-pad"
            placeholder={previous?.duration_seconds != null ? String(previous.duration_seconds) : 'sec'}
            placeholderTextColor={theme.colors.inkMuted}
            value={isTiming ? String(elapsedStopwatchSeconds(stopwatch, now)) : durationField.text}
            onChangeText={durationField.onChangeText}
          />
          <Pressable
            style={[styles.playChip, isTiming && styles.playChipTiming]}
            onPress={handlePlay}
            accessibilityLabel={isTiming ? 'Stop timing' : 'Start timer'}
          >
            <SymbolView
              name={isTiming ? 'stop.fill' : 'play.fill'}
              size={14}
              tintColor={isTiming ? theme.colors.onGradient : theme.colors.ink}
            />
          </Pressable>
        </>
      ) : (
        <>
          <TextInput
            style={[
              styles.input,
              isCompleted ? styles.inputDone : styles.inputPending,
              { width: SET_TABLE_COLUMNS.cell },
            ]}
            onFocus={() => handleFocus('weight')}
            onBlur={() => handleBlur('weight')}
            selectTextOnFocus
            keyboardType="decimal-pad"
            placeholder={previous?.weight_kg != null ? String(previous.weight_kg) : 'kg'}
            placeholderTextColor={theme.colors.inkMuted}
            value={weightField.text}
            onChangeText={weightField.onChangeText}
          />
          <TextInput
            style={[
              styles.input,
              isCompleted ? styles.inputDone : styles.inputPending,
              { width: SET_TABLE_COLUMNS.cell },
            ]}
            onFocus={() => handleFocus('reps')}
            onBlur={() => handleBlur('reps')}
            selectTextOnFocus
            keyboardType="number-pad"
            placeholder={previous?.reps != null ? String(previous.reps) : 'reps'}
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
    </>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  // No backing of its own: the row sits straight on the card's glass. The
  // swipe actions stay hidden at rest (the swipeable keeps them at opacity 0
  // until a swipe starts), so the row doesn't need to be opaque to cover them.
  swipeChild: { backgroundColor: 'transparent', borderRadius: theme.radii.md },
  rowCompleted: { backgroundColor: theme.colors.doneRow },
  // Active row: slightly lifted fill plus a hairline edge. The border is
  // drawn in place of the row's transparent default, so nothing shifts.
  rowEditing: {
    backgroundColor: theme.colors.activeRow,
    borderColor: theme.colors.activeRowBorder,
  },
  // Even inset all round: the same `sm` on every edge, so the checkbox sits
  // the same distance from the row's right edge as from its top and bottom.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.radii.md,
    // Always present but transparent at rest, so turning it on doesn't
    // shift the row. Hairline was too faint to register — 1pt reads.
    borderWidth: 1,
    borderColor: 'transparent',
    gap: theme.spacing.xs,
  },
  setCell: { alignItems: 'center', justifyContent: 'center' },
  // The filled chip the set number, inputs and checkbox all share, Hevy-style:
  // one fill, one height, one radius, so the row reads as a line of controls.
  chip: {
    alignSelf: 'stretch',
    height: SET_CHIP_HEIGHT,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.glassSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Logged set: the number chip turns `done` too, a step stronger than the
  // row's wash so it stays visible as a chip.
  chipDone: { backgroundColor: theme.colors.doneChip },
  previousCell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.xs },
  // Stays centred so the checkbox lines up under the header's tick, and
  // stays 44pt wide so the tap target isn't shrunk (see the note at the
  // Pressable). The row's own inset supplies the gap to the card edge.
  checkCell: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumber: { ...theme.type.heading },
  ghost: { ...theme.type.body, color: theme.colors.inkMuted },
  input: {
    ...theme.type.body,
    color: theme.colors.ink,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    height: SET_CHIP_HEIGHT,
    paddingVertical: 0,
    borderRadius: theme.radii.md,
  },
  // An empty cell has to look like something you can fill in: pending sets
  // sit in the shared filled chip, logged ones drop to plain bold text on
  // the row's done wash. Fill only, no border, so nothing reflows.
  inputPending: { backgroundColor: theme.colors.glassSolid },
  inputDone: { backgroundColor: 'transparent', fontWeight: '700' },
  // The TIME cell and its play chip together span the two weighted columns,
  // so the header's TIME label still sits over them.
  durationInput: { width: SET_TABLE_COLUMNS.cell * 2 - SET_CHIP_HEIGHT - theme.spacing.xs },
  // A running count reads in the accent so it's clearly live, not logged.
  inputTiming: { color: theme.colors.accent, fontWeight: '700' },
  playChip: {
    width: SET_CHIP_HEIGHT,
    height: SET_CHIP_HEIGHT,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.glassSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playChipTiming: { backgroundColor: theme.colors.accent },
  // Always shows a checkmark: muted on the chip when pending, filled blue
  // when done. A completed set used to be signalled by tinting the whole
  // row, which read as a stray coloured rectangle.
  checkbox: {
    width: SET_CHIP_HEIGHT,
    height: SET_CHIP_HEIGHT,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.glassSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: theme.colors.done },
});
