import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { dayMonth, kg } from '@/features/profile/format';
import { useMyLogbook } from '@/features/stats/hooks';
import { exerciseHistory, personalBests } from '@/features/stats/stats';
import type { WorkoutSet } from '@/features/workouts/types';

const CHART_SESSIONS = 12;
const CHART_HEIGHT = 120;

function setText(s: WorkoutSet): string {
  if (s.duration_seconds != null && s.weight_kg == null) return `${s.duration_seconds} s`;
  if (s.weight_kg != null && s.reps != null) return `${Math.round(s.weight_kg * 10) / 10} × ${s.reps}`;
  if (s.weight_kg != null) return kg(s.weight_kg);
  return s.reps != null ? `${s.reps} reps` : '—';
}

/**
 * One exercise over time: its bests, the last dozen sessions as bars (best
 * weight, or reps or time when it isn't loaded), and every session's sets.
 */
export default function ExerciseHistoryScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const styles = useThemedStyles(createStyles);
  const book = useMyLogbook();
  const best = personalBests(book).find((b) => b.key === key);
  const history = exerciseHistory(book, key);

  if (!best) {
    return (
      <View style={styles.scroll}>
        <Text style={styles.empty}>Nothing logged for this exercise yet.</Text>
      </View>
    );
  }

  // What a bar measures: weight when it's loaded, otherwise time or reps.
  const measure = (sets: WorkoutSet[]): number =>
    best.heaviest != null
      ? Math.max(0, ...sets.map((s) => s.weight_kg ?? 0))
      : best.longest != null
        ? Math.max(0, ...sets.map((s) => s.duration_seconds ?? 0))
        : Math.max(0, ...sets.map((s) => s.reps ?? 0));
  const unit = best.heaviest != null ? 'kg' : best.longest != null ? 's' : 'reps';
  const chart = history.slice(0, CHART_SESSIONS).reverse().map((h) => ({ at: h.at, value: measure(h.sets) }));
  const top = Math.max(1, ...chart.map((c) => c.value));

  const tiles = [
    best.heaviest != null && { label: 'Heaviest', value: kg(best.heaviest.weightKg) },
    best.oneRepMax != null && { label: 'Est. 1 rep max', value: kg(best.oneRepMax.kg) },
    best.mostReps != null && { label: 'Most reps', value: String(best.mostReps.reps) },
    best.longest != null && { label: 'Longest', value: `${best.longest.seconds} s` },
  ].filter((t): t is { label: string; value: string } => !!t);

  return (
    <>
      <Stack.Title>{best.name}</Stack.Title>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.tiles}>
          {tiles.map((t) => (
            <Card key={t.label} style={styles.tile} glass={false}>
              <Text style={styles.tileLabel}>{t.label}</Text>
              <Text style={styles.tileValue}>{t.value}</Text>
            </Card>
          ))}
        </View>

        {chart.length > 1 && (
          <View style={styles.chartWrap}>
            <SectionLabel>{`Best per session (${unit})`}</SectionLabel>
            <View style={styles.chart}>
              {chart.map((c) => (
                <View key={c.at} style={styles.barSlot}>
                  <Text style={styles.barValue} numberOfLines={1}>
                    {Math.round(c.value * 10) / 10}
                  </Text>
                  <View style={[styles.bar, { height: Math.max(3, (c.value / top) * CHART_HEIGHT) }]} />
                </View>
              ))}
            </View>
          </View>
        )}

        <SectionLabel>History</SectionLabel>
        {history.map((h) => (
          <View key={`${h.workoutId}-${h.at}`} style={styles.session}>
            <View style={styles.sessionTop}>
              <Text style={styles.sessionTitle} numberOfLines={1}>
                {h.workoutTitle}
              </Text>
              <Text style={styles.sessionDate}>{dayMonth(h.at)}</Text>
            </View>
            <Text style={styles.sets}>{h.sets.map(setText).join('   ')}</Text>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  empty: { ...theme.type.body, color: theme.colors.inkMuted, textAlign: 'center', paddingTop: 120 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  tile: { flexBasis: '47%', flexGrow: 1, gap: 2, padding: theme.spacing.md },
  tileLabel: { ...theme.type.caption, color: theme.colors.inkMuted },
  tileValue: { ...theme.type.title, color: theme.colors.ink, fontVariant: ['tabular-nums'] },
  chartWrap: { gap: theme.spacing.sm },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: CHART_HEIGHT + 18 },
  barSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  barValue: { fontSize: 9, color: theme.colors.inkMuted, fontVariant: ['tabular-nums'] },
  bar: { alignSelf: 'stretch', backgroundColor: theme.colors.accent, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  session: {
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  sessionTop: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md },
  sessionTitle: { ...theme.type.heading, color: theme.colors.ink, flex: 1 },
  sessionDate: { ...theme.type.caption, color: theme.colors.inkMuted },
  sets: { ...theme.type.body, color: theme.colors.ink, fontVariant: ['tabular-nums'] },
});
