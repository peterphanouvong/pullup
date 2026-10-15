import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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

/** A ticking clock as real state, not a bare re-render tick: React Compiler
 * memoizes render expressions by their dependencies, so computing
 * `elapsedSeconds(workout, new Date())` off a dummy tick froze the display —
 * `now` as state makes the recompute an explicit dependency. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return now;
}

/**
 * The live strip under the workout screen's native header.
 *
 * Each number carries its own label: mid-set and breathing hard, a bare run
 * of values takes longer to read than three labelled columns. Progress is
 * the SETS column ("3 of 13"); there's no separate progress line, because at
 * zero its empty track read as a grey divider under the header.
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
  /** Live sets in the workout — the "of N" in the SETS column. */
  totalCount: number;
}) {
  const styles = useThemedStyles(createStyles);
  const now = useNow();

  const elapsed = elapsedSeconds(workout, now);

  return (
    <View style={styles.statRow}>
      <Stat label="DURATION" value={formatElapsed(elapsed)} />
      <Stat label="VOLUME" value={`${Math.round(volumeKg)} kg`} />
      <Stat label="SETS" value={`${completedCount} of ${totalCount}`} />
    </View>
  );
}

/** Height of the custom title view: two lines inside the 44pt bar. */
const TITLE_HEIGHT = 40;
/** How far the name lifts to make room for the stats line. */
const TITLE_LIFT = 8;
/** Room the bar's own items take on either side of the title (chevron on
 * the left; timer and Finish on the right), so a long name truncates
 * instead of running under them. */
const TITLE_SIDE_ROOM = 210;

/**
 * The workout screen's header title: the session name, plus a compact stats
 * line that appears only while the stats strip below the bar is scrolled
 * away. `reveal` is the same animated value that hides the strip (0 = strip
 * showing, 1 = strip hidden), so the numbers hand off from the strip to the
 * bar instead of vanishing while you work down the list.
 *
 * Opacity and transforms only, so it runs on the native driver.
 */
export function WorkoutHeaderTitle({
  workout,
  volumeKg,
  completedCount,
  totalCount,
  reveal,
}: {
  workout: Workout;
  volumeKg: number;
  completedCount: number;
  totalCount: number;
  reveal: Animated.Value;
}) {
  const styles = useThemedStyles(createStyles);
  const now = useNow();
  const { width } = useWindowDimensions();
  const elapsed = elapsedSeconds(workout, now);

  return (
    <View style={[styles.titleView, { maxWidth: Math.max(120, width - TITLE_SIDE_ROOM) }]}>
      <Animated.Text
        style={[
          styles.titleText,
          { transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [0, -TITLE_LIFT] }) }] },
        ]}
        numberOfLines={1}
      >
        {workout.title}
      </Animated.Text>
      <Animated.Text
        style={[
          styles.titleStats,
          {
            opacity: reveal,
            transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }],
          },
        ]}
        numberOfLines={1}
      >
        {`${formatElapsed(elapsed)} · ${Math.round(volumeKg)} kg · ${completedCount} of ${totalCount}`}
      </Animated.Text>
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
  // Breathing room under the header: the top padding is the gap the old
  // progress line used to fill, and a little more.
  statRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  stat: { flex: 1, gap: 2 },
  statLabel: { ...theme.type.label, fontSize: 9, color: theme.colors.inkMuted },
  statValue: { ...theme.type.heading, color: theme.colors.ink, fontVariant: ['tabular-nums'] },
  // Name centred in the bar when alone; the stats line sits in the bottom
  // of the same box and the name lifts to clear it.
  titleView: { height: TITLE_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  titleText: { ...theme.type.heading, color: theme.colors.ink },
  titleStats: {
    ...theme.type.caption,
    color: theme.colors.inkMuted,
    fontVariant: ['tabular-nums'],
    position: 'absolute',
    bottom: 0,
  },
});
