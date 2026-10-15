import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Card } from '@/components/ui/card';
import { IconCircle } from '@/components/ui/icon-circle';
import { Screen } from '@/components/ui/screen';
import { ScreenTitle } from '@/components/ui/screen-title';
import { haptics } from '@/lib/haptics';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { dateKey, fromKey, localDayOf, monthGrid, plannedDayOn, shiftMonth } from '@/features/programs/calendar';
import { useActiveProgram, useProgram } from '@/features/programs/hooks';
import { stripWeekdayPrefix } from '@/features/programs/labels';
import { useFinishedWorkouts } from '@/features/workouts/hooks';
import type { FinishedWorkoutSummary } from '@/features/workouts/selectors';

const SCREEN_OPTIONS = { presentation: 'modal', headerShown: false } as const;
const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const KIND_LABELS = { lifting: 'Lift', court: 'Court', comp: 'Competition', rest: 'Rest' } as const;

/**
 * The training calendar, opened from the Programme header: a month at a
 * time, Monday first.
 *
 * - A day you trained is a filled blue circle — the one loud mark.
 * - Upcoming planned sessions get a small dot; the competition day's dot
 *   is in `comp`. Past planned days you skipped get nothing: a missed
 *   session is a fact, not a scolding (same rule as the week cards).
 * - Today is a thin blue ring.
 *
 * Tap a day to see what you did and what the plan had; a planned lifting
 * day links through to its session.
 */
export default function CalendarScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const active = useActiveProgram();
  const program = useProgram(active.data?.programId ?? '');
  const finished = useFinishedWorkouts();

  const todayKey = dateKey(new Date());
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedKey, setSelectedKey] = useState(todayKey);

  // Sessions bucketed by the local day they started on.
  const byDay = new Map<string, FinishedWorkoutSummary[]>();
  for (const entry of finished) {
    const key = localDayOf(entry.workout.started_at);
    byDay.set(key, [...(byDay.get(key) ?? []), entry]);
  }

  const weeks = program.data?.weeks ?? [];
  const startDate = active.data?.startDate ?? null;
  const planned = (key: string) => (startDate ? plannedDayOn(key, startDate, weeks) : null);

  const grid = monthGrid(cursor.year, cursor.month);
  const monthCount = grid
    .flat()
    .filter((c) => c.inMonth)
    .reduce((n, c) => n + (byDay.get(c.key)?.length ?? 0), 0);

  function changeMonth(delta: number) {
    haptics.select();
    setCursor((c) => shiftMonth(c.year, c.month, delta));
  }

  function selectDay(key: string) {
    if (key === selectedKey) return;
    haptics.select();
    setSelectedKey(key);
  }

  const selectedWorkouts = byDay.get(selectedKey) ?? [];
  const selectedPlan = planned(selectedKey);
  const selectedDate = fromKey(selectedKey);

  return (
    <Screen>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle title="Calendar">
          <IconCircle name="xmark" fallback="✕" onPress={() => router.back()} />
        </ScreenTitle>

        <Card style={styles.monthCard}>
          <View style={styles.monthRow}>
            <IconCircle name="chevron.left" fallback="‹" size={32} onPress={() => changeMonth(-1)} />
            <View style={styles.monthTitle}>
              <Text style={styles.monthName}>{`${MONTH_NAMES[cursor.month]} ${cursor.year}`}</Text>
              <Text style={styles.monthMeta}>
                {monthCount === 1 ? '1 workout' : `${monthCount} workouts`}
              </Text>
            </View>
            <IconCircle name="chevron.right" fallback="›" size={32} onPress={() => changeMonth(1)} />
          </View>

          <View style={styles.weekRow}>
            {WEEKDAY_INITIALS.map((d, i) => (
              <Text key={i} style={styles.weekdayLabel}>
                {d}
              </Text>
            ))}
          </View>

          {grid.map((week) => (
            <View key={week[0].key} style={styles.weekRow}>
              {week.map((cell) => {
                const trained = byDay.has(cell.key);
                const plan = planned(cell.key);
                const upcoming = cell.key >= todayKey;
                const showPlanDot =
                  !trained && plan != null && (plan.kind === 'comp' || (upcoming && plan.kind !== 'rest'));
                const isToday = cell.key === todayKey;
                const isSelected = cell.key === selectedKey;
                return (
                  <Pressable key={cell.key} style={styles.cell} onPress={() => selectDay(cell.key)}>
                    <View
                      style={[
                        styles.dayCircle,
                        isSelected && !trained && styles.daySelected,
                        trained && styles.dayTrained,
                        isToday && styles.dayToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          !cell.inMonth && styles.dayOutside,
                          plan?.kind === 'comp' && !trained && styles.dayComp,
                          trained && styles.dayNumberTrained,
                        ]}
                      >
                        {cell.dayOfMonth}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.dot,
                        showPlanDot && styles.dotPlanned,
                        showPlanDot && plan?.kind === 'comp' && styles.dotComp,
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Card>

        <Text style={styles.dayHeading}>
          {selectedDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>

        {selectedPlan != null && (
          <Pressable
            disabled={selectedPlan.kind !== 'lifting' || program.data == null}
            onPress={() => {
              haptics.tap();
              router.push(`/program/${program.data!.id}/day/${selectedPlan.dayId}`);
            }}
          >
            <Card style={styles.row} glass={false}>
              <View style={styles.rowBody}>
                <Text style={styles.rowEyebrow}>{`${selectedPlan.weekName} · ${KIND_LABELS[selectedPlan.kind]}`}</Text>
                <Text style={styles.rowTitle}>{stripWeekdayPrefix(selectedPlan.dayName)}</Text>
              </View>
              {selectedPlan.kind === 'lifting' && (
                <SymbolView name="chevron.right" size={15} tintColor={theme.colors.inkMuted} />
              )}
            </Card>
          </Pressable>
        )}

        {selectedWorkouts.map(({ workout, summary }) => (
          <Card key={workout.id} style={styles.row} glass={false}>
            <View style={styles.trainedMark}>
              <SymbolView name="checkmark" size={13} tintColor={theme.colors.onAccent} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{workout.title}</Text>
              <Text style={styles.rowMeta}>
                {`${Math.max(1, Math.round(summary.durationSeconds / 60))} min · ${Math.round(summary.volumeKg)} kg · ${summary.completedCount} sets`}
              </Text>
            </View>
          </Card>
        ))}

        {selectedPlan == null && selectedWorkouts.length === 0 && (
          <Text style={styles.empty}>Nothing planned or logged.</Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const CELL_CIRCLE = 34;

const createStyles = (theme: Theme) => StyleSheet.create({
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  monthCard: { gap: theme.spacing.xs },
  monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  monthTitle: { flex: 1, alignItems: 'center', gap: 2 },
  monthName: { ...theme.type.heading, color: theme.colors.ink },
  monthMeta: { ...theme.type.caption, color: theme.colors.inkMuted, fontVariant: ['tabular-nums'] },
  weekRow: { flexDirection: 'row' },
  weekdayLabel: { ...theme.type.label, flex: 1, textAlign: 'center', color: theme.colors.inkMuted },
  // 44pt tall: the tap target, with the dot sitting under the circle.
  cell: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dayCircle: {
    width: CELL_CIRCLE,
    height: CELL_CIRCLE,
    borderRadius: CELL_CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Always present so a ring appearing never shifts the number.
    borderWidth: 1,
    borderColor: 'transparent',
  },
  daySelected: { backgroundColor: theme.colors.glassControl },
  dayTrained: { backgroundColor: theme.colors.done },
  dayToday: { borderColor: theme.colors.done },
  dayNumber: { ...theme.type.body, color: theme.colors.ink, fontVariant: ['tabular-nums'] },
  dayOutside: { color: theme.colors.inkMuted },
  dayComp: { color: theme.colors.comp, fontWeight: '700' },
  dayNumberTrained: { color: theme.colors.onAccent, fontWeight: '700' },
  dot: { width: 4, height: 4, borderRadius: 2 },
  dotPlanned: { backgroundColor: theme.colors.inkMuted },
  dotComp: { backgroundColor: theme.colors.comp },
  dayHeading: { ...theme.type.heading, color: theme.colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  rowBody: { flex: 1, gap: 2 },
  rowEyebrow: { ...theme.type.label, color: theme.colors.inkMuted },
  rowTitle: { ...theme.type.heading, color: theme.colors.ink },
  rowMeta: { ...theme.type.caption, color: theme.colors.inkMuted, fontVariant: ['tabular-nums'] },
  trainedMark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.done,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { ...theme.type.body, color: theme.colors.inkMuted },
});
