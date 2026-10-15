import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '@/styles/use-theme';
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

/**
 * The live strip under the workout screen's native header.
 *
 * A session has a finish line — every set is either done or not — so the
 * strip opens with a progress line that fills as sets land. Underneath,
 * each number carries its own label: mid-set and breathing hard, a bare run
 * of values takes longer to read than three labelled columns.
 */
export function WorkoutStatsRow({
  workout,
  volumeKg,
  completedCount,
  totalCount,
}: {
  workout: Workout;
  volumeKg: number;
  completedCount: number;
  /** Live sets in the workout — the denominator of the progress line. */
  totalCount: number;
}) {
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
  const progress = totalCount > 0 ? Math.min(1, completedCount / totalCount) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.statRow}>
        <Stat label="DURATION" value={formatElapsed(elapsed)} />
        <Stat label="VOLUME" value={`${Math.round(volumeKg)} kg`} />
        <Stat label="SETS" value={`${completedCount} of ${totalCount}`} />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { gap: theme.spacing.md },
  track: { height: 3, backgroundColor: theme.colors.border },
  trackFill: { height: 3, backgroundColor: theme.colors.done },
  statRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  stat: { flex: 1, gap: 2 },
  statLabel: { ...theme.type.label, fontSize: 9, color: theme.colors.inkMuted },
  statValue: { ...theme.type.heading, color: theme.colors.ink, fontVariant: ['tabular-nums'] },
});
