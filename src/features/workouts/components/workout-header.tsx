import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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

/** Height of the custom title view: two lines inside the 44pt bar. */
const TITLE_HEIGHT = 40;
/** Everything else in the bar's row: the screen margins, the chevron and
 * its gap on the left, and the timer, Finish pill and its inset on the
 * right. The title takes what's left and truncates, so it can never run
 * under the buttons. Generous on purpose: a gap is fine, an overlap isn't. */
const TITLE_SIDE_ROOM = 270;

/**
 * The workout screen's header title: the session name with the live stats
 * as its subtitle — duration, volume, sets done of total. The bar carries
 * the numbers so no strip has to float over the list.
 *
 * Rendered as a LEFT bar item beside the chevron, not as the centred title:
 * a centred title only gets twice the narrower of the two sides, and the
 * timer + Finish side left it almost no room, so the timer sat on top of
 * it. Left-aligned, it gets everything up to the right-hand buttons.
 */
export function WorkoutHeaderTitle({
  workout,
  volumeKg,
  completedCount,
  totalCount,
}: {
  workout: Workout;
  volumeKg: number;
  completedCount: number;
  /** Live sets in the workout — the "of N". */
  totalCount: number;
}) {
  const styles = useThemedStyles(createStyles);
  const now = useNow();
  const { width } = useWindowDimensions();
  const elapsed = elapsedSeconds(workout, now);

  return (
    <View style={[styles.titleView, { maxWidth: Math.max(120, width - TITLE_SIDE_ROOM) }]}>
      <Text style={styles.titleText} numberOfLines={1}>
        {workout.title}
      </Text>
      <Text style={styles.titleStats} numberOfLines={1}>
        {`${formatElapsed(elapsed)} · ${Math.round(volumeKg)} kg · ${completedCount} of ${totalCount} sets`}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  titleView: { height: TITLE_HEIGHT, justifyContent: 'center', alignItems: 'flex-start', gap: 1 },
  titleText: { ...theme.type.heading, color: theme.colors.ink },
  titleStats: {
    ...theme.type.caption,
    color: theme.colors.inkMuted,
    fontVariant: ['tabular-nums'],
  },
});
