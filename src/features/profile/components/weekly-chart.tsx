import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { haptics } from '@/lib/haptics';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { weeklyTotals, type Logbook, type WeeklyMetric } from '@/features/stats/stats';
import { dayMonth, thousands } from '../format';

const METRICS: { key: WeeklyMetric; label: string }[] = [
  { key: 'duration', label: 'Duration' },
  { key: 'volume', label: 'Volume' },
  { key: 'sets', label: 'Sets' },
];

const WEEKS = 12;
const CHART_HEIGHT = 140;

function formatValue(metric: WeeklyMetric, value: number): string {
  if (metric === 'duration') {
    if (value === 0) return '0 hrs';
    return value < 1 ? `${Math.round(value * 60)} min` : `${Math.round(value * 10) / 10} hrs`;
  }
  if (metric === 'volume') return `${thousands(value)} kg`;
  return `${Math.round(value)} sets`;
}

/** A tidy top for the axis: 1, 2 or 5 times a power of ten, at or above the
 * tallest bar, so the label is a number people read at a glance. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((m) => m * power >= value)!;
  return step * power;
}

/**
 * Twelve weeks of training as bars, Hevy-style, with this week's figure as
 * the headline. Plain views rather than a chart library: twelve rectangles
 * don't need one. This week's bar is lighter while it's still filling up.
 */
export function WeeklyChart({ book, now }: { book: Logbook; now: Date }) {
  const styles = useThemedStyles(createStyles);
  const [metric, setMetric] = useState<WeeklyMetric>('duration');
  const totals = weeklyTotals(book, metric, now, WEEKS);
  const top = niceMax(Math.max(...totals.map((t) => t.value)));
  const thisWeek = totals[totals.length - 1].value;

  return (
    <View style={styles.wrap}>
      <Text style={styles.headline}>
        {formatValue(metric, thisWeek)}
        <Text style={styles.headlineMuted}> this week</Text>
      </Text>

      <View style={styles.chart}>
        <View style={styles.axis}>
          <Text style={styles.axisLabel}>{formatValue(metric, top)}</Text>
          <Text style={styles.axisLabel}>0</Text>
        </View>
        <View style={styles.plot}>
          <View style={[styles.gridLine, { top: 0 }]} />
          <View style={[styles.gridLine, { top: CHART_HEIGHT / 2 }]} />
          <View style={[styles.gridLine, { top: CHART_HEIGHT }]} />
          {totals.map((t, i) => (
            <View key={t.monday} style={styles.barSlot}>
              <View
                style={[
                  styles.bar,
                  { height: Math.max(t.value > 0 ? 3 : 0, (t.value / top) * CHART_HEIGHT) },
                  i === totals.length - 1 && styles.barCurrent,
                ]}
              />
            </View>
          ))}
        </View>
      </View>
      <View style={styles.xLabels}>
        {/* One label per three weeks, each as wide as its three bars. */}
        {totals
          .filter((_, i) => i % 3 === 0)
          .map((t) => (
            <Text key={t.monday} style={styles.xLabel} numberOfLines={1}>
              {dayMonth(t.monday)}
            </Text>
          ))}
      </View>

      <View style={styles.pills}>
        {METRICS.map((m) => {
          const selected = m.key === metric;
          return (
            <Pressable
              key={m.key}
              onPress={() => {
                if (selected) return;
                haptics.select();
                setMetric(m.key);
              }}
              style={[styles.pill, selected && styles.pillSelected]}
            >
              <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const AXIS_WIDTH = 56;

const createStyles = (theme: Theme) => StyleSheet.create({
  wrap: { gap: theme.spacing.md },
  headline: { ...theme.type.title, color: theme.colors.ink, fontVariant: ['tabular-nums'] },
  headlineMuted: { ...theme.type.body, color: theme.colors.inkMuted, fontWeight: '400' },
  chart: { flexDirection: 'row', height: CHART_HEIGHT },
  axis: { width: AXIS_WIDTH, justifyContent: 'space-between', paddingRight: theme.spacing.xs },
  axisLabel: { ...theme.type.caption, color: theme.colors.inkMuted, fontSize: 11, marginVertical: -7 },
  plot: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
  barSlot: { flex: 1, height: CHART_HEIGHT, justifyContent: 'flex-end' },
  bar: { backgroundColor: theme.colors.accent, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  barCurrent: { opacity: 0.45 },
  xLabels: { flexDirection: 'row', gap: 4, marginLeft: AXIS_WIDTH, marginTop: -theme.spacing.xs },
  xLabel: { flex: 1, ...theme.type.caption, fontSize: 11, color: theme.colors.inkMuted },
  pills: { flexDirection: 'row', gap: theme.spacing.sm },
  pill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.glassControl,
  },
  // Ink on the selected pill, not the accent: the bars are the colour here.
  pillSelected: { backgroundColor: theme.colors.ink },
  pillText: { ...theme.type.caption, color: theme.colors.ink },
  pillTextSelected: { color: theme.colors.canvas },
});
