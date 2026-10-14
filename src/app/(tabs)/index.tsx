import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { Card } from '@/components/ui/card';
import { DayStrip, type DayStripItem } from '@/components/ui/day-strip';
import { FLOATING_ACTION_CLEARANCE, FloatingAction } from '@/components/ui/floating-action';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ProgressSegments } from '@/components/ui/progress-segments';
import { Screen } from '@/components/ui/screen';
import { ScreenTitle } from '@/components/ui/screen-title';
import { WeekDayCard } from '@/components/ui/week-day-card';
import { QueryFallback } from '@/features/programs/components/query-fallback';
import { useActiveProgram, useProgram } from '@/features/programs/hooks';
import { currentProgramPosition, nextCompDay } from '@/features/programs/schedule';
import type { ProgramDay } from '@/features/programs/types';
import { useSession } from '@/lib/auth';
import {
  startEmptyWorkout,
  startWorkoutFromDay,
  useActiveWorkout,
  useWeekCompletion,
} from '@/features/workouts/hooks';
import { startWorkoutOrPrompt } from '@/features/workouts/start-guard';
import { dayState, floatingAction } from '@/features/workouts/today-state';

const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

/** Local-calendar-date arithmetic for the day strip — day positions are
 * template order (1 = Monday), matching schedule.ts. */
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
  const activeWorkout = useActiveWorkout();
  const scrollRef = useRef<ScrollView>(null);
  // Card y-offsets recorded from onLayout (not index math) so the strip's
  // jump-nav stays correct however tall individual cards render.
  const cardOffsets = useRef<Record<string, number>>({});

  // Derived ahead of the early returns so the completion hook can be called
  // unconditionally (Rules of Hooks); empty until programme data loads.
  const currentWeek = (() => {
    const data = program.data;
    const startDate = active.data?.startDate;
    if (!data || !startDate) return null;
    const position = currentProgramPosition(startDate, new Date(), data.weeks.length);
    return data.weeks.find((w) => w.position === position.week) ?? data.weeks[0] ?? null;
  })();
  const completion = useWeekCompletion(currentWeek?.days.map((d) => d.id) ?? []);

  function guardedStart(startFn: () => void) {
    startWorkoutOrPrompt(activeWorkout, startFn);
  }

  function handleStartEmpty() {
    guardedStart(() => {
      const workoutId = startEmptyWorkout(session.user.id);
      router.push(`/workout/${workoutId}`);
    });
  }

  function renderFloating(todayDay: ProgramDay | null, todayCompleted: boolean) {
    const action = floatingAction({ activeWorkout, todayDay, todayCompleted });
    if (action.kind === 'resume') {
      return (
        <FloatingAction label="Resume workout" onPress={() => router.push(`/workout/${action.workoutId}`)} />
      );
    }
    if (action.kind === 'startToday' && todayDay != null) {
      return (
        <FloatingAction
          label="Start today's session"
          onPress={() =>
            guardedStart(() => {
              const workoutId = startWorkoutFromDay(todayDay, todayDay.id, session.user.id);
              router.push(`/workout/${workoutId}`);
            })
          }
        />
      );
    }
    return <FloatingAction label="Start workout" onPress={handleStartEmpty} />;
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
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          <ScreenTitle title="Today" />
          <Card style={styles.messageCard}>
            <Text style={styles.messageTitle}>No active programme</Text>
            <Text style={styles.messageBody}>Pick a programme from Plan to see today&apos;s session.</Text>
            <PrimaryButton title="Browse programmes" onPress={() => router.push('/plan')} />
          </Card>
        </ScrollView>
        {renderFloating(null, false)}
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
  const week = currentWeek;
  const days = week?.days ?? [];
  const todayDay = days.find((d) => d.position === position.day) ?? null;
  const todayCompleted = todayDay != null && completion[todayDay.id] === true;

  const liftingDays = days.filter((d) => d.kind === 'lifting');
  const doneCount = liftingDays.filter((d) => completion[d.id]).length;

  const weekPosition = week?.position ?? position.week;
  const stripItems: DayStripItem[] = days.map((d) => {
    const offset = (weekPosition - 1) * 7 + (d.position - 1);
    const date = addDaysLocal(parseYMDLocal(startDate), offset);
    const dotColor = d.kind === 'rest' ? undefined : d.kind === 'lifting' ? theme.colors.accent : theme.colors.comp;
    return {
      key: d.id,
      weekdayLabel: WEEKDAY_LABELS[d.position - 1] ?? '',
      dayNumber: date.getDate(),
      dotColor,
      isToday: isSameYMD(date, today),
      isSelected: !position.finished && d.position === position.day,
    };
  });

  return (
    <Screen>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, styles.contentWithFloating]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <ScreenTitle title="Today" />
        {compDay != null && !position.finished && (
          <Text style={styles.eyebrow}>{`T–${compDay.daysAway} DAYS · ${compDay.dayName}`}</Text>
        )}

        {position.finished ? (
          <Card style={styles.messageCard}>
            <Text style={styles.messageTitle}>Programme finished</Text>
            <Text style={styles.messageBody}>
              {`You completed ${data.name}. Head to Plan to pick what's next.`}
            </Text>
            <PrimaryButton title="Browse programmes" onPress={() => router.push('/plan')} />
          </Card>
        ) : (
          <>
            <Pressable onPress={() => router.push(`/program/${programId}`)}>
              <Text style={styles.weekLine}>
                {`Week ${position.week} of ${data.weeks.length} · ${week?.phase ?? ''}`}
              </Text>
            </Pressable>

            <DayStrip
              items={stripItems}
              onSelect={(key) => {
                const y = cardOffsets.current[key];
                if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
              }}
            />

            <ProgressSegments total={liftingDays.length} filled={doneCount} />

            {days.map((d) => {
              const state = dayState(d, position.day, completion[d.id] === true);
              const isToday = d.position === position.day;
              return (
                <Pressable
                  key={d.id}
                  onLayout={(e) => {
                    cardOffsets.current[d.id] = e.nativeEvent.layout.y;
                  }}
                >
                  <WeekDayCard
                    day={d}
                    state={state}
                    isToday={isToday}
                    meta={metaFor(d)}
                    onPress={
                      d.kind === 'lifting' ? () => router.push(`/program/${programId}/day/${d.id}`) : undefined
                    }
                  />
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>
      {renderFloating(position.finished ? null : todayDay, todayCompleted)}
    </Screen>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  content: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
  contentWithFloating: { paddingBottom: FLOATING_ACTION_CLEARANCE + 96 },
  eyebrow: { ...theme.type.label, color: theme.colors.comp },
  weekLine: { ...theme.type.caption, color: theme.colors.inkMuted },
  messageCard: { gap: theme.spacing.sm },
  messageTitle: { ...theme.type.heading, color: theme.colors.ink },
  messageBody: { ...theme.type.body, color: theme.colors.inkMuted },
});
