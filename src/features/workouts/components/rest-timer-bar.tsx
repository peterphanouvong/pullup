import { useEffect, useRef, useState } from 'react';
import { use$ } from '@legendapp/state/react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from '@/components/ui/glass-surface';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { adjustRestTimer, remainingSeconds, restTimer$, skipRestTimer } from '../rest-timer';

/** Once the countdown has been visibly at (or past) zero for this long, the
 * bar auto-dismisses itself — long enough for the haptic + "0:00" to
 * register, short enough not to linger as dead chrome. */
const AUTO_DISMISS_SECONDS = 2;

function formatRemaining(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Floating countdown bar for the active-workout screen: auto-starts (via
 * `completeSet` in `hooks.ts`) when a set completes on an exercise with
 * `rest_seconds` set, ticks every second off `endsAt - now` (so background
 * time never causes drift), supports ±15s adjust and Skip, and fires a
 * single haptic the moment it reaches zero. Renders nothing while no timer
 * is running. */
export function RestTimerBar() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const timer = use$(() => restTimer$.get());
  // The clock is real state: React Compiler memoizes render expressions by
  // their dependencies, so deriving `remaining` from a bare re-render tick
  // froze the countdown — `now` as state makes each tick a real dependency.
  // Still timestamp-derived (endsAt − now), so backgrounding can't drift it.
  const [now, setNow] = useState(() => new Date());
  // Tracks which timer's zero-crossing already fired a haptic (by its
  // endsAt), so re-rendering on every 1s tick never re-fires it.
  const firedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!timer) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const remaining = timer ? remainingSeconds(timer, now) : 0;

  // Runs every render (no deps): cheap, and the only way to re-check
  // `remaining` against the latest tick without stashing time in state.
  useEffect(() => {
    if (!timer) return;
    if (remaining <= 0 && firedForRef.current !== timer.endsAt) {
      firedForRef.current = timer.endsAt;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (remaining <= -AUTO_DISMISS_SECONDS) {
      skipRestTimer();
    }
  });

  if (!timer) return null;

  return (
    <View style={[styles.bar, { bottom: insets.bottom + theme.spacing.md }]}>
      {/* Real Liquid Glass behind the bar — it floats over the set list, so
          there's content underneath for it to refract. */}
      <GlassSurface cornerRadius={theme.radii.pill} />
      <Pressable style={styles.adjustButton} onPress={() => adjustRestTimer(-15)} hitSlop={8}>
        <Text style={styles.adjustLabel}>-15s</Text>
      </Pressable>

      <Text style={styles.remaining}>{formatRemaining(remaining)}</Text>

      <Pressable style={styles.adjustButton} onPress={() => adjustRestTimer(15)} hitSlop={8}>
        <Text style={styles.adjustLabel}>+15s</Text>
      </Pressable>

      <Pressable onPress={skipRestTimer} hitSlop={8}>
        <Text style={styles.skipLabel}>Skip</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  bar: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.glassBorder,
    borderRadius: theme.radii.pill,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    overflow: 'hidden',
    ...theme.shadow.float,
  },
  adjustButton: { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.sm },
  adjustLabel: { ...theme.type.heading, color: theme.colors.ink },
  // The countdown is the point of the bar: give it real size.
  // Explicit lineHeight: without one the 30pt numerals' default line box
  // got cropped by the bar's `overflow: hidden`.
  remaining: {
    ...theme.type.title,
    fontSize: 30,
    lineHeight: 38,
    color: theme.colors.ink,
    fontVariant: ['tabular-nums'],
  },
  skipLabel: { ...theme.type.heading, color: theme.colors.inkMuted },
});
