import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { Card } from '@/components/ui/card';
import { DayStrip, type DayStripItem } from '@/components/ui/day-strip';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { ScreenTitle } from '@/components/ui/screen-title';
import { WorkoutCard } from '@/components/ui/workout-card';
import { QueryFallback } from '@/features/programs/components/query-fallback';
import { useActiveProgram, useProgram } from '@/features/programs/hooks';
import { currentProgramPosition, nextCompDay } from '@/features/programs/schedule';
import type { ProgramDay } from '@/features/programs/types';
import { useSession } from '@/lib/auth';
import { ResumeBanner } from '@/features/workouts/components/resume-banner';
import {
  discardWorkout,
  startEmptyWorkout,
  startWorkoutFromDay,
  useActiveWorkout,
  useHasFinishedWorkoutForDay,
} from '@/features/workouts/hooks';

const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

/** Local-calendar-date arithmetic for rendering the day strip — day
 * positions are template order (1 = Monday), never derived from a real
 * weekday lookup, matching `schedule.ts`'s "weekday mapping is template
 * order for now" note. */
function parseYMDLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDaysLocal(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isSameYMD(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function metaFor(day: ProgramDay): string {
  if (day.kind === 'lifting') {
    return `${day.exercises.length} exercise${day.exercises.length === 1 ? '' : 's'}`;
  }
  if (day.notes) return day.notes;
  if (day.kind === 'comp') return 'Competition day';
  if (day.kind === 'court') return 'Court session';
  return 'Rest day';
}

export default function TodayScreen() {
  const active = useActiveProgram();
  const program = useProgram(active.data?.programId ?? '');
  const session = useSession();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const activeWorkout = useActiveWorkout();

  // Mirrors the main render's day-selection logic (below, after the
  // loading/error early returns) so the `useHasFinishedWorkoutForDay` hook
  // call itself can sit here, unconditionally, ahead of those returns —
  // Rules of Hooks forbids calling it only in the branch that has `day`
  // available. Safe/null until the programme data has loaded.
  const selectedProgramDayId = (() => {
    const data = program.data;
    const startDate = active.data?.startDate;
    if (!data || !startDate) return null;
    const today = new Date();
    const position = currentProgramPosition(startDate, today, data.weeks.length);
    const week = data.weeks.find((w) => w.position === position.week) ?? data.weeks[0];
    const selectedDayPosition = selectedDay ?? position.day;
    const day = week?.days.find((d) => d.position === selectedDayPosition) ?? week?.days[0] ?? null;
    return day?.id ?? null;
  })();
  const hasFinishedForDay = useHasFinishedWorkoutForDay(selectedProgramDayId);

  /** Starting a new workout while one is already in progress prompts to
   * resume it or discard it first, instead of silently abandoning it. */
  function startNewWorkoutOrPrompt(startFn: () => void) {
    if (activeWorkout) {
      Alert.alert(
        'Workout in progress',
        `You have an unfinished workout — "${activeWorkout.title}". Resume it, or discard it and start new?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Resume', onPress: () => router.push(`/workout/${activeWorkout.id}`) },
          {
            text: 'Discard & start new',
            style: 'destructive',
            onPress: () => {
              discardWorkout(activeWorkout.id);
              startFn();
            },
          },
        ],
      );
      return;
    }
    startFn();
  }

  function handleStartEmpty() {
    startNewWorkoutOrPrompt(() => {
      const workoutId = startEmptyWorkout(session.user.id);
      router.push(`/workout/${workoutId}`);
    });
  }

  if (active.isPending) {
    return <QueryFallback isError={false} message="Loading…" onRetry={() => active.refetch()} />;
  }
  if (active.isError) {
    return (
      <QueryFallback isError message="Couldn't load your programme." onRetry={() => active.refetch()} />
    );
  }

  if (!active.data || !active.data.startDate) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ScreenTitle title="Today" />
          {activeWorkout != null && <ResumeBanner workout={activeWorkout} />}
          <Card style={styles.messageCard}>
            <Text style={styles.messageTitle}>No active programme</Text>
            <Text style={styles.messageBody}>Pick a programme from Plan to see today&apos;s session.</Text>
            <PrimaryButton title="Browse programmes" onPress={() => router.push('/plan')} />
          </Card>
          <Pressable onPress={handleStartEmpty} hitSlop={8}>
            <Text style={styles.quietAction}>Start empty workout</Text>
          </Pressable>
        </ScrollView>
      </Screen>
    );
  }

  if (program.isPending || program.isError) {
    return (
      <QueryFallback
        isError={program.isError}
        message="Couldn't load today's session."
        onRetry={() => program.refetch()}
      />
    );
  }

  const { programId, startDate } = active.data;
  const data = program.data;
  const today = new Date();
  const position = currentProgramPosition(startDate, today, data.weeks.length);
  const compDay = nextCompDay(data.weeks, position, startDate, today);
  const week = data.weeks.find((w) => w.position === position.week) ?? data.weeks[0];
  const selectedDayPosition = selectedDay ?? position.day;
  const day = week?.days.find((d) => d.position === selectedDayPosition) ?? week?.days[0] ?? null;

  const weekPosition = week?.position ?? position.week;
  const items: DayStripItem[] = (week?.days ?? []).map((d) => {
    const offset = (weekPosition - 1) * 7 + (d.position - 1);
    const date = addDaysLocal(parseYMDLocal(startDate), offset);
    const dotColor = d.kind === 'rest' ? undefined : d.kind === 'lifting' ? theme.colors.accent : theme.colors.comp;
    return {
      key: d.id,
      weekdayLabel: WEEKDAY_LABELS[d.position - 1] ?? '',
      dayNumber: date.getDate(),
      dotColor,
      isToday: isSameYMD(date, today),
      isSelected: d.position === selectedDayPosition,
    };
  });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenTitle title="Today" />
        {activeWorkout != null && <ResumeBanner workout={activeWorkout} />}
        {compDay != null && !position.finished && (
          <Text style={styles.eyebrow}>{`T–${compDay.daysAway} DAYS · ${compDay.dayName}`}</Text>
        )}

        {position.finished ? (
          <>
            <Card style={styles.messageCard}>
              <Text style={styles.messageTitle}>Programme finished</Text>
              <Text style={styles.messageBody}>
                {`You completed ${data.name}. Head to Plan to pick what's next.`}
              </Text>
              <PrimaryButton title="Browse programmes" onPress={() => router.push('/plan')} />
            </Card>
            <Pressable onPress={handleStartEmpty} hitSlop={8}>
              <Text style={styles.quietAction}>Start empty workout</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable onPress={() => router.push(`/program/${programId}`)}>
              <Text style={styles.weekLine}>
                {`Week ${position.week} of ${data.weeks.length} · ${week?.phase ?? ''}`}
              </Text>
            </Pressable>

            <DayStrip
              items={items}
              onSelect={(key) => {
                const found = week?.days.find((d) => d.id === key);
                if (found) setSelectedDay(found.position);
              }}
            />

            {day != null && (
              <>
                <WorkoutCard
                  kind={day.kind}
                  title={day.name}
                  meta={metaFor(day)}
                  completed={hasFinishedForDay}
                  onPress={
                    day.kind === 'lifting' ? () => router.push(`/program/${programId}/day/${day.id}`) : undefined
                  }
                />
                {day.kind === 'lifting' && (
                  <PrimaryButton
                    title="Start workout"
                    onPress={() =>
                      startNewWorkoutOrPrompt(() => {
                        const workoutId = startWorkoutFromDay(day, day.id, session.user.id);
                        router.push(`/workout/${workoutId}`);
                      })
                    }
                  />
                )}
              </>
            )}

            <Pressable onPress={handleStartEmpty} hitSlop={8}>
              <Text style={styles.quietAction}>Start empty workout</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  content: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
  eyebrow: { ...theme.type.label, color: theme.colors.comp },
  weekLine: { ...theme.type.caption, color: theme.colors.inkMuted },
  messageCard: { gap: theme.spacing.sm },
  messageTitle: { ...theme.type.heading, color: theme.colors.ink },
  messageBody: { ...theme.type.body, color: theme.colors.inkMuted },
  quietAction: { ...theme.type.body, color: theme.colors.inkMuted, textAlign: 'center' },
});
