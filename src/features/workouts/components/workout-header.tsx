import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { elapsedSeconds } from '../selectors';
import type { Workout } from '../types';

function formatElapsed(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function WorkoutHeader({
  workout,
  volumeKg,
  completedCount,
  onFinish,
}: {
  workout: Workout;
  volumeKg: number;
  completedCount: number;
  onFinish: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  // Forces a re-render every second; the elapsed value itself is always
  // recomputed fresh from `started_at` below, never accumulated off a
  // previous tick, so drift/background time are never an issue.
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsed = elapsedSeconds(workout, new Date());

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <SymbolView name="chevron.down" size={20} tintColor={theme.colors.ink} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {workout.title}
        </Text>
        <Pressable style={styles.finishPill} onPress={onFinish}>
          <Text style={styles.finishLabel}>Finish</Text>
        </Pressable>
      </View>

      <View style={styles.statRow}>
        <Text style={styles.elapsed}>{formatElapsed(elapsed)}</Text>
        <Text style={styles.stat}>{`${Math.round(volumeKg)} kg`}</Text>
        <Text style={styles.stat}>{`${completedCount} sets`}</Text>
        <SymbolView name="timer" size={16} tintColor={theme.colors.inkMuted} />
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  title: { ...theme.type.heading, color: theme.colors.ink, flex: 1 },
  finishPill: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.pill,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  finishLabel: { ...theme.type.caption, color: theme.colors.onAccent, fontWeight: '700' },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  elapsed: { ...theme.type.heading, color: theme.colors.accent, fontVariant: ['tabular-nums'] },
  stat: { ...theme.type.caption, color: theme.colors.inkMuted },
});
