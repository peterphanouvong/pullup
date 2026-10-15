/**
 * Action-sheet wiring for the per-exercise ⋮ menu and the shared rest-timer
 * preset sheet. iOS gets a native `ActionSheetIOS`; every other platform
 * falls back to a plain `Alert` with the same options in the same order —
 * both ship in react-native core, so neither needs a new dependency.
 */

import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { removeExercise, moveExerciseInWorkout, updateExerciseRestSeconds } from '../hooks';
import { startRestTimer } from '../rest-timer';
import type { WorkoutExercise } from '../types';

const REST_TIMER_PRESETS: { label: string; seconds: number | null }[] = [
  { label: 'OFF', seconds: null },
  { label: '1:00', seconds: 60 },
  { label: '1:30', seconds: 90 },
  { label: '2:00', seconds: 120 },
  { label: '2:30', seconds: 150 },
  { label: '3:00', seconds: 180 },
];

/** Navigates to the exercise picker, in `add` mode (appends to the workout)
 * or `replace` mode (swaps one `workout_exercise` row's identity). Shared by
 * the workout screen's "+ Add Exercise" button and this menu's "Replace
 * exercise…" item. */
export function openExercisePicker(workoutId: string, mode: 'add' | 'replace', workoutExerciseId?: string): void {
  router.push({
    pathname: '/workout/picker',
    params: { workoutId, mode, ...(workoutExerciseId ? { workoutExerciseId } : {}) },
  });
}

/** The rest-timer preset sheet (OFF / 1:00 / 1:30 / 2:00 / 2:30 / 3:00),
 * writing `rest_seconds` via `updateExerciseRestSeconds`. Shared by the ⋮
 * menu's "Rest timer…" item and the exercise card's rest-timer row tap. */
/** Starts a rest countdown straight from a preset — the header's timer
 * button, for resting between things the app didn't prompt you about. */
export function openStartRestSheet(): void {
  const presets = REST_TIMER_PRESETS.filter((p) => p.seconds != null);
  const labels = presets.map((p) => p.label);

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { title: 'Start rest timer', options: [...labels, 'Cancel'], cancelButtonIndex: labels.length },
      (index) => {
        const seconds = presets[index]?.seconds;
        if (seconds != null) startRestTimer(seconds);
      },
    );
    return;
  }

  Alert.alert('Start rest timer', undefined, [
    ...presets.map((preset) => ({
      text: preset.label,
      onPress: () => {
        if (preset.seconds != null) startRestTimer(preset.seconds);
      },
    })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}

export function openRestTimerSheet(workoutExerciseId: string): void {
  const labels = REST_TIMER_PRESETS.map((p) => p.label);

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { title: 'Rest Timer', options: [...labels, 'Cancel'], cancelButtonIndex: labels.length },
      (index) => {
        if (index < REST_TIMER_PRESETS.length) {
          updateExerciseRestSeconds(workoutExerciseId, REST_TIMER_PRESETS[index].seconds);
        }
      },
    );
    return;
  }

  Alert.alert('Rest Timer', undefined, [
    ...REST_TIMER_PRESETS.map((preset) => ({
      text: preset.label,
      onPress: () => updateExerciseRestSeconds(workoutExerciseId, preset.seconds),
    })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}

function confirmRemoveExercise(workoutExerciseId: string): void {
  Alert.alert('Remove exercise?', "This removes it and all its logged sets. This can't be undone.", [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => removeExercise(workoutExerciseId) },
  ]);
}

export interface ExerciseMenuArgs {
  workoutId: string;
  exercise: WorkoutExercise;
  /** Whether this exercise has a non-deleted neighbor above/below it in the
   * workout's visible, position-sorted list — the caller (which already has
   * that list, from `useWorkout`) computes these from the row's index. */
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** Focuses the exercise card's notes input. */
  onAddNote: () => void;
}

/**
 * Builds + shows the per-exercise ⋮ action sheet: Add note, Replace
 * exercise…, Move up/down (omitted at the ends), Rest timer…, Remove
 * exercise (destructive, confirmed), Cancel.
 */
export function openExerciseMenu(args: ExerciseMenuArgs): void {
  const { workoutId, exercise, canMoveUp, canMoveDown, onAddNote } = args;

  const items: { label: string; destructive?: boolean; onPress: () => void }[] = [
    { label: 'Add note', onPress: onAddNote },
    { label: 'Replace exercise…', onPress: () => openExercisePicker(workoutId, 'replace', exercise.id) },
    ...(canMoveUp ? [{ label: 'Move up', onPress: () => moveExerciseInWorkout(workoutId, exercise.id, 'up') }] : []),
    ...(canMoveDown
      ? [{ label: 'Move down', onPress: () => moveExerciseInWorkout(workoutId, exercise.id, 'down') }]
      : []),
    { label: 'Rest timer…', onPress: () => openRestTimerSheet(exercise.id) },
    { label: 'Remove exercise', destructive: true, onPress: () => confirmRemoveExercise(exercise.id) },
  ];
  const labels = items.map((i) => i.label);

  if (Platform.OS === 'ios') {
    const destructiveButtonIndex = items.findIndex((i) => i.destructive);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: exercise.exercise_name,
        options: [...labels, 'Cancel'],
        cancelButtonIndex: labels.length,
        destructiveButtonIndex,
      },
      (index) => {
        if (index < items.length) items[index].onPress();
      },
    );
    return;
  }

  Alert.alert(exercise.exercise_name, undefined, [
    ...items.map((i) => ({
      text: i.label,
      style: i.destructive ? ('destructive' as const) : undefined,
      onPress: i.onPress,
    })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}
