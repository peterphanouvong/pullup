import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { router, Stack } from 'expo-router';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { Card } from '@/components/ui/card';
import { FLOATING_ACTION_CLEARANCE, FloatingAction } from '@/components/ui/floating-action';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ProgressSegments } from '@/components/ui/progress-segments';
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
import { dayMetrics, dayState, floatingAction } from '@/features/workouts/today-state';

const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function metaFor(day: ProgramDay): string {
  if (day.kind === 'lifting') {
    return `${day.exercises.length} exercise${day.exercises.length === 1 ? '' : 's'}`;
  }
  if (day.notes) return day.notes;
  if (day.kind === 'comp') return 'Competition day';
  if (day.kind === 'court') return 'Court session';
  return 'Rest day';
}

/** Native header gear: a UIKit menu (not an action sheet) so it gets the
 * system's liquid-glass bar background and overflow handling for free. */
function SettingsToolbar({ programId }: { programId: string | null }) {
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Menu icon="gearshape" accessibilityLabel="Settings">
        {programId != null && (
          <Stack.Toolbar.MenuAction
            icon="list.bullet.rectangle"
            onPress={() => router.push(`/program/${programId}`)}
          >
            View programme
          </Stack.Toolbar.MenuAction>
        )}
        <Stack.Toolbar.MenuAction icon="rectangle.stack" onPress={() => router.push('/plan')}>
          Switch plan
        </Stack.Toolbar.MenuAction>
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );
}

export default function TodayScreen() {
  const active = useActiveProgram();
  const program = useProgram(active.data?.programId ?? '');
  const session = useSession();
  const styles = useThemedStyles(createStyles);
  const activeWorkout = useActiveWorkout();
  const scrollRef = useRef<ScrollView>(null);
  // Card y-offsets recorded from onLayout (not index math) so the strip's
  // jump-nav stays correct however tall individual cards render.
  const cardOffsets = useRef<Record<string, number>>({});
  // Scroll-aware floating action: which day card the viewport is "on". Null
  // until the user scrolls — the button then targets today's session.
  const [focusedDayId, setFocusedDayId] = useState<string | null>(null);
  // Mirrors focusedDayId so the scroll handler can compare without a state
  // read (and without re-subscribing), keeping scroll-time work ref-only.
  const focusedDayIdRef = useRef<string | null>(null);
  // Which programme week the screen shows. Null = follow the calendar's
  // current week; a number pins the view to that week (via the week pills).
  const [viewedWeekPosition, setViewedWeekPosition] = useState<number | null>(null);

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
      <>
        <SettingsToolbar programId={null} />
        <ScrollView
          style={styles.scroll}
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
      </>
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

  function handleSelectWeek(selected: number) {
    // Selecting the calendar's current week clears the pin so the view keeps
    // tracking day changes.
    setViewedWeekPosition(selected === position.week ? null : selected);
    focusedDayIdRef.current = null;
    setFocusedDayId(null);
  }

  return (
    // Fragment, NOT a wrapper View: react-native-screens finds the header's
    // content ScrollView by walking subviews[0] from the screen, so any View
    // between the screen and the ScrollView breaks the large-title collapse.
    <>
      <SettingsToolbar programId={programId} />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, styles.contentWithFloating]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        scrollEventThrottle={100}
        onScroll={(e) => {
          // Focus = the last day card whose top sits above a third of the
          // viewport; offsets come from onLayout, so promoted/taller cards
          // can't drift the math. Only a CHANGE of focused day writes state —
          // setting it on every scroll event re-rendered the whole screen
          // ~10x/sec mid-scroll, which read as the scroll being hijacked.
          const anchorY = e.nativeEvent.contentOffset.y + e.nativeEvent.layoutMeasurement.height / 3;
          let focused: string | null = null;
          for (const d of days) {
            const y = cardOffsets.current[d.id];
            if (y != null && y <= anchorY) focused = d.id;
          }
          if (focused !== focusedDayIdRef.current) {
            focusedDayIdRef.current = focused;
            setFocusedDayId(focused);
          }
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
            {/* Day-of-month chips are gone — each card already carries its
                weekday — so the week pills sit directly above the phase. */}
            <WeekPills
              weeks={data.weeks}
              viewedPosition={weekPosition}
              currentPosition={position.week}
              onSelect={handleSelectWeek}
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
                    weekday={WEEKDAY_LABELS[d.position - 1] ?? ''}
                    metrics={dayMetrics(d)}
                    meta={metaFor(d)}
                    onPress={
                      d.kind === 'lifting' ? () => router.push(`/program/${programId}/day/${d.id}`) : undefined
                    }
                    // Tapping the card previews the day; the in-card button
                    // commits. Only the active, unfinished session gets one.
                    onStart={
                      isToday && state === 'upcoming'
                        ? () =>
                            guardedStart(() => {
                              const workoutId = startWorkoutFromDay(d, d.id, session.user.id);
                              router.push(`/workout/${workoutId}`);
                            })
                        : undefined
                    }
                  />
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>
      {renderFloating(position.finished ? null : targetDay, targetCompleted, targetIsToday)}
    </>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  // Canvas lives on the ScrollView itself — there's no wrapper View to paint.
  scroll: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { padding: theme.spacing.lg, paddingTop: theme.spacing.sm, gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
  contentWithFloating: { paddingBottom: FLOATING_ACTION_CLEARANCE + 96 },
  phaseLabel: { ...theme.type.label, color: theme.colors.inkMuted },
  messageCard: { gap: theme.spacing.sm },
  messageTitle: { ...theme.type.heading, color: theme.colors.ink },
  messageBody: { ...theme.type.body, color: theme.colors.inkMuted },
});
