import { useEffect, useState } from 'react';
import { Animated, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { use$ } from '@legendapp/state/react';
import { haptics } from '@/lib/haptics';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { fillDownTargets } from '../edit';
import { focusedSet$, type FillField } from '../focused-set';
import { updateSet } from '../hooks';
import { workoutSets$ } from '../store';
import type { WorkoutSet } from '../types';

/** Room the bar takes above the keyboard: what a focused input is scrolled
 * clear of. */
export const FILL_BAR_CLEARANCE = 56;

const FIELD_LABELS: Record<FillField, string> = { weight: 'kg', reps: 'reps', duration: 'time' };

function valueOf(set: WorkoutSet, field: FillField): number | null {
  return field === 'duration' ? set.duration_seconds : field === 'reps' ? set.reps : set.weight_kg;
}

function patchFor(field: FillField, value: number | null) {
  return field === 'duration'
    ? { duration_seconds: value }
    : field === 'reps'
      ? { reps: value }
      : { weight_kg: value };
}

/**
 * "Fill kg" / "Fill reps" pills riding on top of the keyboard while a set
 * input has focus: copies that column into every set below the row.
 *
 * One bar for the whole screen, not an `InputAccessoryView` per input. RN
 * links an accessory to its input once, by searching the window when the
 * accessory mounts, and never again — so it could quietly end up attached
 * to nothing, and fill-down vanished. This bar follows the keyboard itself
 * and reads the focused row from `focusedSet$`, so there's nothing to link.
 *
 * The keyboard's own inset doesn't know about the bar, so `onReveal` asks
 * the screen to scroll the focused input clear of it.
 */
export function FillDownBar({ onReveal }: { onReveal: (keyboardTop: number) => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [lift] = useState(() => new Animated.Value(0));
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);

  const focused = use$(focusedSet$);
  const set = use$(() => (focused ? workoutSets$[focused.setId].get() : null));
  const siblings = use$(() => {
    if (!set) return [];
    return Object.values(workoutSets$.get() ?? {}).filter(
      (s): s is WorkoutSet => !!s && s.workout_exercise_id === set.workout_exercise_id,
    );
  });

  const targets = set ? fillDownTargets(siblings, set.id) : [];
  const fields: FillField[] = focused?.field === 'duration' ? ['duration'] : ['weight', 'reps'];
  // Only columns with something to copy: filling an empty value would just
  // clear the rows below.
  const fillable = set ? fields.filter((f) => valueOf(set, f) != null) : [];
  const visible = keyboardTop != null && targets.length > 0 && fillable.length > 0;

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardTop(e.endCoordinates.screenY);
      Animated.timing(lift, {
        toValue: -e.endCoordinates.height,
        duration: e.duration || 250,
        useNativeDriver: true,
      }).start();
    });
    const hide = Keyboard.addListener('keyboardWillHide', (e) => {
      setKeyboardTop(null);
      Animated.timing(lift, { toValue: 0, duration: e.duration || 250, useNativeDriver: true }).start();
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [lift]);

  // Keep the focused input above the bar: once the keyboard has settled,
  // and again whenever focus moves to another input while it's up.
  const focusKey = focused ? `${focused.setId}:${focused.field}` : null;
  useEffect(() => {
    if (!visible || keyboardTop == null) return;
    const handle = setTimeout(() => onReveal(keyboardTop), 300);
    return () => clearTimeout(handle);
  }, [visible, keyboardTop, focusKey, onReveal]);

  function fill(field: FillField) {
    if (!set) return;
    haptics.tap();
    const patch = patchFor(field, valueOf(set, field));
    for (const id of targets) updateSet(id, patch);
  }

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[styles.host, { opacity: visible ? 1 : 0, transform: [{ translateY: lift }] }]}
    >
      <View style={styles.bar}>
        {fillable.map((field) => (
          <Pressable
            key={field}
            style={({ pressed }) => [styles.fillButton, pressed && styles.fillButtonPressed]}
            onPress={() => fill(field)}
          >
            <SymbolView name="arrow.down.to.line" size={14} tintColor={theme.colors.onAccent} />
            <Text style={styles.fillLabel}>{`Fill ${FIELD_LABELS[field]}`}</Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}


const createStyles = (theme: Theme) => StyleSheet.create({
  // Pinned to the bottom of the screen, then lifted by the keyboard height.
  host: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  // Buttons floating above the keyboard: no toolbar slab behind them, and
  // sized to their labels rather than stretched across the screen.
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  fillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.pill,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    ...theme.shadow.float,
  },
  fillButtonPressed: { opacity: 0.8 },
  fillLabel: { ...theme.type.caption, fontWeight: '700', color: theme.colors.onAccent },
});
