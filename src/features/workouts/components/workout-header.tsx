import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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

/** The live stat strip under the workout screen's native header: ticking
 * elapsed time, total volume, completed sets. (Title/Finish/dismiss moved
 * into the native navigation bar.) */
export function WorkoutStatsRow({
  workout,
  volumeKg,
  completedCount,
}: {
  workout: Workout;
  volumeKg: number;
  completedCount: number;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  // The clock is real state (not a bare re-render tick): React Compiler
  // memoizes render expressions by their dependencies, so computing
  // `elapsedSeconds(workout, new Date())` off a dummy tick froze the display
  // — `now` as state makes the recompute an explicit dependency.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsed = elapsedSeconds(workout, now);

  return (
    <View style={styles.statRow}>
      <Text style={styles.elapsed}>{formatElapsed(elapsed)}</Text>
      <Text style={styles.stat}>{`${Math.round(volumeKg)} kg`}</Text>
      <Text style={styles.stat}>{`${completedCount} sets`}</Text>
      <SymbolView name="timer" size={16} tintColor={theme.colors.inkMuted} />
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    // Sits a little lower than the bar above it, and keeps less vertical
    // bulk than horizontal so the strip reads as one line, not a band.
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  elapsed: { ...theme.type.heading, color: theme.colors.ink, fontVariant: ['tabular-nums'] },
  stat: { ...theme.type.caption, color: theme.colors.inkMuted },
});
