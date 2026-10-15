import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { GlassSurface } from '@/components/ui/glass-surface';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { discardWorkout, useCurrentExerciseName } from '../hooks';
import { elapsedSeconds } from '../selectors';
import type { Workout } from '../types';

/** Vertical room the bar needs above the screen bottom: the translucent
 * native tab bar plus a small gap. Scroll content on screens hosting the bar
 * should pad its bottom by this plus the bar's height (~72). */
export const MINIMIZED_BAR_CLEARANCE = 54;

/** Hevy-compact elapsed: "23s" under a minute, then "4:05" / "1:02:11". */
function formatElapsedCompact(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  if (clamped < 60) return `${clamped}s`;
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const ss = String(clamped % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Hevy-style minimized bar for a live workout, floating above the tab bar:
 * chevron.up to expand, green live dot + title + ticking elapsed time, the
 * exercise the lifter is on, and a trash button to discard. Tapping anywhere
 * else on the bar also reopens the workout.
 *
 * The bar is a Liquid Glass capsule: it floats over scrolling content, which
 * is exactly where glass earns its keep. The translucent fill underneath is
 * the pre-iOS-26 fallback. */
export function MinimizedWorkoutBar({ workout }: { workout: Workout }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const exerciseName = useCurrentExerciseName(workout.id);

  // The clock is real state: React Compiler memoizes render expressions, so
  // the elapsed display must depend on `now` as an explicit state value.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  function openWorkout() {
    router.push(`/workout/${workout.id}`);
  }

  function confirmDiscard() {
    Alert.alert(
      'Discard workout?',
      "This removes the workout and everything logged in it. This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => discardWorkout(workout.id) },
      ],
    );
  }

  return (
    <Pressable
      onPress={openWorkout}
      style={({ pressed }) => [
        styles.bar,
        { bottom: insets.bottom + MINIMIZED_BAR_CLEARANCE },
        pressed && styles.barPressed,
      ]}
    >
      <GlassSurface shape="capsule" />
      <Pressable
        onPress={openWorkout}
        style={({ pressed }) => [styles.circle, pressed && styles.circlePressed]}
        hitSlop={4}
      >
        <SymbolView name="chevron.up" size={18} tintColor={theme.colors.ink} />
      </Pressable>

      <View style={styles.center}>
        <View style={styles.titleRow}>
          <View style={styles.liveDot} />
          <Text style={styles.title} numberOfLines={1}>
            {workout.title}
          </Text>
          <Text style={styles.elapsed}>{formatElapsedCompact(elapsedSeconds(workout, now))}</Text>
        </View>
        <Text style={styles.subtitle} numberOfLines={1}>
          {exerciseName ?? 'No exercises yet'}
        </Text>
      </View>

      <Pressable
        onPress={confirmDiscard}
        style={({ pressed }) => [styles.circle, pressed && styles.circlePressed]}
        hitSlop={4}
      >
        <SymbolView name="trash" size={17} tintColor={theme.colors.danger} />
      </Pressable>
    </Pressable>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  bar: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.glass,
    borderRadius: theme.radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.glassBorder,
    padding: theme.spacing.sm,
    // Clips the glass layer to the capsule.
    overflow: 'hidden',
  },
  barPressed: { opacity: 0.95 },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.glassControl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circlePressed: { opacity: 0.7 },
  center: { flex: 1, alignItems: 'center', gap: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
  },
  title: { ...theme.type.heading, color: theme.colors.ink, flexShrink: 1 },
  elapsed: { ...theme.type.heading, fontWeight: '400', color: theme.colors.ink, fontVariant: ['tabular-nums'] },
  subtitle: { ...theme.type.body, color: theme.colors.inkMuted },
});
