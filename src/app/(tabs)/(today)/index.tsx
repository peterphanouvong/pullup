import { useRef, useState } from 'react';
import { ActionSheetIOS, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { Card } from '@/components/ui/card';
import { DayStrip, type DayStripItem } from '@/components/ui/day-strip';
import { FLOATING_ACTION_CLEARANCE, FloatingAction } from '@/components/ui/floating-action';
import { IconCircle } from '@/components/ui/icon-circle';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ProgressSegments } from '@/components/ui/progress-segments';
import { Screen } from '@/components/ui/screen';
import { WeekDayCard } from '@/components/ui/week-day-card';
import { WeekPills } from '@/components/ui/week-pills';
import { QueryFallback } from '@/features/programs/components/query-fallback';
import { useActiveProgram, useProgram } from '@/features/programs/hooks';
import { currentProgramPosition } from '@/features/programs/schedule';
import type { ProgramDay } from '@/features/programs/types';
import { useSession } from '@/lib/auth';
import {
  startEmptyWorkout,
  startWorkoutFromDay,
  useActiveWorkout,
  useWeekCompletion,
} from '@/features/workouts/hooks';
import { MinimizedWorkoutBar } from '@/features/workouts/components/minimized-workout-bar';
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

/** Header gear → quick actions: programme overview, or off to Plan to pick a
 * different programme. */
function openSettingsSheet(programId: string | null) {
  const options = programId != null ? ['View programme', 'Switch plan', 'Cancel'] : ['Switch plan', 'Cancel'];
  ActionSheetIOS.showActionSheetWithOptions(
    { options, cancelButtonIndex: options.length - 1 },
    (index) => {
      if (programId != null && index === 0) router.push(`/program/${programId}`);
      else if ((programId != null && index === 1) || (programId == null && index === 0)) router.push('/plan');
    },
  );
}

function SettingsButton({ programId }: { programId: string | null }) {
  return <IconCircle name="gearshape.fill" size={32} onPress={() => openSettingsSheet(programId)} />;
}

export default function TodayScreen() {
  const active = useActiveProgram();
  const program = useProgram(active.data?.programId ?? '');
  const session = useSession();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const activeWorkout = useActiveWorkout();
  const scrollRef = useRef<ScrollView>(null);
  // Card y-offsets recorded from onLayout (not index math) so the strip's
  // jump-nav stays correct however tall individual cards render.
  const cardOffsets = useRef<Record<string, number>>({});
  // Scroll-aware floating action: which day card the viewport is "on". Null
  // until the user scrolls — the button then targets today's session.
  const [focusedDayId, setFocusedDayId] = useState<string | null>(null);
  // Which programme week the screen shows. Null = follow the calendar's
  // current week; a number pins the view to that week (via the week pills).
  const [viewedWeekPosition, setViewedWeekPosition] = useState<number | null>(null);

  // The collapsed glass header's height — jump-nav scroll targets stop below
  // it instead of underneath it.
  const headerClearance = insets.top + 56;

  // Derived ahead of the early returns so the completion hook can be called
  // unconditionally (Rules of Hooks); empty until programme data loads.
  const viewedWeek = (() => {
    const data = program.data;
    const startDate = active.data?.startDate;
    if (!data || !startDate) return null;
    const position = currentProgramPosition(startDate, new Date(), data.weeks.length);
    const wanted = viewedWeekPosition ?? position.week;
    return data.weeks.find((w) => w.position === wanted) ?? data.weeks[0] ?? null;
  })();
  const completion = useWeekCompletion(viewedWeek?.days.map((d) => d.id) ?? []);

  function guardedStart(startFn: () => void) {
    startWorkoutOrPrompt(activeWorkout, startFn);
  }

  function handleStartEmpty() {
    guardedStart(() => {
      const workoutId = startEmptyWorkout(session.user.id);
      router.push(`/workout/${workoutId}`);
    });
  }

  /** The floating button follows the scroll: it targets the day card the
   * viewport is on (when that day is a startable lifting session), labelled
   * "Start today's session" / "Start THU session" accordingly. A live
   * workout always wins — as the Hevy-style minimized bar; everything else
   * falls back to an explicit "Start empty workout". */
  function renderFloating(
    targetDay: ProgramDay | null,
    targetCompleted: boolean,
    targetIsToday: boolean,
  ) {
    const action = floatingAction({ activeWorkout, todayDay: targetDay, todayCompleted: targetCompleted });
    if (action.kind === 'resume' && activeWorkout != null) {
      return <MinimizedWorkoutBar workout={activeWorkout} />;
    }
    if (action.kind === 'startToday' && targetDay != null) {
      const label = targetIsToday
        ? "Start today's session"
        : `Start ${WEEKDAY_LABELS[targetDay.position - 1] ?? ''} session`;
      return (
        <FloatingAction
          label={label}
          onPress={() =>
            guardedStart(() => {
              const workoutId = startWorkoutFromDay(targetDay, targetDay.id, session.user.id);
              router.push(`/workout/${workoutId}`);
            })
          }
        />
      );
    }
    return <FloatingAction label="Start empty workout" onPress={handleStartEmpty} />;
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
      <Screen topInset={false}>
        <Stack.Screen options={{ headerRight: () => <SettingsButton programId={null} /> }} />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          <Card style={styles.messageCard}>
            <Text style={styles.messageTitle}>No active programme</Text>
            <Text style={styles.messageBody}>Pick a programme from Plan to see today&apos;s session.</Text>
            <PrimaryButton title="Browse programmes" onPress={() => router.push('/plan')} />
          </Card>
        </ScrollView>
        {renderFloating(null, false, false)}
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
  const week = viewedWeek;
  const days = week?.days ?? [];
  const isCurrentWeek = !position.finished && week?.position === position.week;
  const todayDay = isCurrentWeek ? days.find((d) => d.position === position.day) ?? null : null;
  // Which position counts as "today" for missed/passed states: in a past
  // week every day is behind us (8), in a future week none are (0).
  const effectiveTodayPosition = week == null || isCurrentWeek
    ? position.day
    : week.position < position.week
      ? 8
      : 0;

  // The button's target: the scrolled-to day when the user has scrolled,
  // today's session otherwise.
  const focusedDay = focusedDayId != null ? days.find((d) => d.id === focusedDayId) ?? null : null;
  const targetDay = focusedDay ?? todayDay;
  const targetCompleted = targetDay != null && completion[targetDay.id] === true;
  const targetIsToday = targetDay != null && todayDay != null && targetDay.id === todayDay.id;

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
      isPast: d.position < effectiveTodayPosition,
    };
  });

  function handleSelectWeek(selected: number) {
    // Selecting the calendar's current week clears the pin so the view keeps
    // tracking day changes.
    setViewedWeekPosition(selected === position.week ? null : selected);
    setFocusedDayId(null);
  }

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ headerRight: () => <SettingsButton programId={programId} /> }} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, styles.contentWithFloating]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        scrollEventThrottle={100}
        onScroll={(e) => {
          // Focus = the last day card whose top sits above a third of the
          // viewport; offsets come from onLayout, so promoted/taller cards
          // can't drift the math.
          const anchorY = e.nativeEvent.contentOffset.y + e.nativeEvent.layoutMeasurement.height / 3;
          let focused: string | null = null;
          for (const d of days) {
            const y = cardOffsets.current[d.id];
            if (y != null && y <= anchorY) focused = d.id;
          }
          setFocusedDayId(focused);
        }}
      >
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
            <WeekPills
              weeks={data.weeks}
              viewedPosition={weekPosition}
              currentPosition={position.week}
              onSelect={handleSelectWeek}
            />

            <DayStrip
              items={stripItems}
              onSelect={(key) => {
                const y = cardOffsets.current[key];
                if (y != null) {
                  scrollRef.current?.scrollTo({ y: y - headerClearance, animated: true });
                }
              }}
            />

            <Text style={styles.phaseLabel}>{week?.phase ?? ''}</Text>
            <ProgressSegments total={liftingDays.length} filled={doneCount} />

            {days.map((d) => {
              const state = dayState(d, effectiveTodayPosition, completion[d.id] === true);
              const isToday = isCurrentWeek && d.position === position.day;
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
                    passed={d.position < effectiveTodayPosition}
                    eyebrow={WEEKDAY_LABELS[d.position - 1] ?? ''}
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
      {renderFloating(position.finished ? null : targetDay, targetCompleted, targetIsToday)}
    </Screen>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  content: { padding: theme.spacing.lg, paddingTop: theme.spacing.sm, gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
  contentWithFloating: { paddingBottom: FLOATING_ACTION_CLEARANCE + 96 },
  phaseLabel: { ...theme.type.label, color: theme.colors.inkMuted, marginTop: theme.spacing.sm },
  messageCard: { gap: theme.spacing.sm },
  messageTitle: { ...theme.type.heading, color: theme.colors.ink },
  messageBody: { ...theme.type.body, color: theme.colors.inkMuted },
});
