import { Card } from "@/components/ui/card";
import { PrimaryButton } from "@/components/ui/primary-button";
import { ProgressSegments } from "@/components/ui/progress-segments";
import { WeekDayCard } from "@/components/ui/week-day-card";
import { WeekPills } from "@/components/ui/week-pills";
import { QueryFallback } from "@/features/programs/components/query-fallback";
import { useActiveProgram, useProgram } from "@/features/programs/hooks";
import { currentProgramPosition } from "@/features/programs/schedule";
import type { ProgramDay } from "@/features/programs/types";
import {
  MINIMIZED_BAR_CLEARANCE,
  MinimizedWorkoutBar,
} from "@/features/workouts/components/minimized-workout-bar";
import {
  startEmptyWorkout,
  startWorkoutFromDay,
  useActiveWorkout,
  useWeekCompletion,
} from "@/features/workouts/hooks";
import { startWorkoutOrPrompt } from "@/features/workouts/start-guard";
import { dayMetrics, dayState } from "@/features/workouts/today-state";
import { useSession } from "@/lib/auth";
import { haptics } from "@/lib/haptics";
import type { Theme } from "@/styles/theme";
import { useThemedStyles, useTheme } from "@/styles/use-theme";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

const WEEKDAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function metaFor(day: ProgramDay): string {
  if (day.kind === "lifting") {
    return `${day.exercises.length} exercise${day.exercises.length === 1 ? "" : "s"}`;
  }
  if (day.notes) return day.notes;
  if (day.kind === "comp") return "Competition day";
  if (day.kind === "court") return "Court session";
  return "Rest day";
}

/** Native header gear: a UIKit menu (not an action sheet) so it gets the
 * system's overflow handling for free.
 *
 * `hidesSharedBackground` drops the liquid-glass capsule the system draws
 * behind bar items, leaving just the glyph over the header's own material.
 * It's the only lever here — the capsule's opacity isn't adjustable, so
 * it's capsule or no capsule. */
function SettingsToolbar({
  programId,
  onStartEmpty,
}: {
  programId: string | null;
  onStartEmpty: () => void;
}) {
  const theme = useTheme();
  return (
    <>
      {/* The training calendar, leading: what you've done and what's coming.
        Settings stays alone on the trailing side. */}
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="calendar"
          accessibilityLabel="Calendar"
          hidesSharedBackground
          tintColor={theme.colors.ink}
          onPress={() => {
            haptics.tap();
            router.push("/calendar");
          }}
        />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu
          icon="gearshape"
          accessibilityLabel="Settings"
          hidesSharedBackground
          tintColor={theme.colors.ink}
        >
          {/* Starting an unplanned session is the rare case — it lives in the
            menu rather than occupying a full-width button over the week. */}
          <Stack.Toolbar.MenuAction icon="plus" onPress={onStartEmpty}>
            Start empty workout
          </Stack.Toolbar.MenuAction>
          {programId != null && (
            <Stack.Toolbar.MenuAction
              icon="list.bullet.rectangle"
              onPress={() => router.push(`/program/${programId}`)}
            >
              View programme
            </Stack.Toolbar.MenuAction>
          )}
          <Stack.Toolbar.MenuAction
            icon="rectangle.stack"
            onPress={() => router.push("/plan")}
          >
            Switch plan
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </>
  );
}

export default function TodayScreen() {
  const active = useActiveProgram();
  const program = useProgram(active.data?.programId ?? "");
  const session = useSession();
  const styles = useThemedStyles(createStyles);
  const activeWorkout = useActiveWorkout();
  // Which programme week the screen shows. Null = follow the calendar's
  // current week; a number pins the view to that week (via the week pills).
  const [viewedWeekPosition, setViewedWeekPosition] = useState<number | null>(
    null,
  );

  // Derived ahead of the early returns so the completion hook can be called
  // unconditionally (Rules of Hooks); empty until programme data loads.
  const viewedWeek = (() => {
    const data = program.data;
    const startDate = active.data?.startDate;
    if (!data || !startDate) return null;
    const position = currentProgramPosition(
      startDate,
      new Date(),
      data.weeks.length,
    );
    const wanted = viewedWeekPosition ?? position.week;
    return (
      data.weeks.find((w) => w.position === wanted) ?? data.weeks[0] ?? null
    );
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

  /** The floating slot is only ever the live-workout bar now: day cards
   * carry their own start buttons, and the unplanned session lives in the
   * header menu. */
  function renderFloating() {
    if (activeWorkout == null) return null;
    return <MinimizedWorkoutBar workout={activeWorkout} />;
  }

  if (active.isPending) {
    return (
      <QueryFallback
        isError={false}
        message="Loading…"
        onRetry={() => active.refetch()}
      />
    );
  }
  if (active.isError) {
    return (
      <QueryFallback
        isError
        message="Couldn't load your programme."
        onRetry={() => active.refetch()}
      />
    );
  }

  if (!active.data || !active.data.startDate) {
    return (
      <>
        <SettingsToolbar programId={null} onStartEmpty={handleStartEmpty} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          <Card style={styles.messageCard}>
            <Text style={styles.messageTitle}>No active programme</Text>
            <Text style={styles.messageBody}>
              Pick a programme from Plan to see today&apos;s session.
            </Text>
            <PrimaryButton
              title="Browse programmes"
              onPress={() => router.push("/plan")}
            />
          </Card>
        </ScrollView>
        {renderFloating()}
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
  // Which position counts as "today" for missed/passed states: in a past
  // week every day is behind us (8), in a future week none are (0).
  const effectiveTodayPosition =
    week == null || isCurrentWeek
      ? position.day
      : week.position < position.week
        ? 8
        : 0;

  const liftingDays = days.filter((d) => d.kind === "lifting");
  const doneCount = liftingDays.filter((d) => completion[d.id]).length;

  const weekPosition = week?.position ?? position.week;

  function handleSelectWeek(selected: number) {
    // Selecting the calendar's current week clears the pin so the view keeps
    // tracking day changes.
    setViewedWeekPosition(selected === position.week ? null : selected);
  }

  return (
    // Fragment, NOT a wrapper View: react-native-screens finds the header's
    // content ScrollView by walking subviews[0] from the screen, so any View
    // between the screen and the ScrollView breaks the large-title collapse.
    <>
      <SettingsToolbar programId={programId} onStartEmpty={handleStartEmpty} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          activeWorkout != null && styles.contentWithFloating,
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {position.finished ? (
          <Card style={styles.messageCard}>
            <Text style={styles.messageTitle}>Programme finished</Text>
            <Text style={styles.messageBody}>
              {`You completed ${data.name}. Head to Plan to pick what's next.`}
            </Text>
            <PrimaryButton
              title="Browse programmes"
              onPress={() => router.push("/plan")}
            />
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

            <Text style={styles.phaseLabel}>{week?.phase ?? ""}</Text>
            <ProgressSegments total={liftingDays.length} filled={doneCount} />

            {days.map((d) => {
              const state = dayState(
                d,
                effectiveTodayPosition,
                completion[d.id] === true,
              );
              const isToday = isCurrentWeek && d.position === position.day;
              return (
                <Pressable key={d.id}>
                  <WeekDayCard
                    day={d}
                    state={state}
                    isToday={isToday}
                    weekday={WEEKDAY_LABELS[d.position - 1] ?? ""}
                    metrics={dayMetrics(d)}
                    meta={metaFor(d)}
                    onPress={
                      d.kind === "lifting"
                        ? () => router.push(`/program/${programId}/day/${d.id}`)
                        : undefined
                    }
                    // Tapping the card previews the day; the in-card button
                    // commits. Only the active, unfinished session gets one.
                    onStart={
                      isToday && state === "upcoming"
                        ? () =>
                            guardedStart(() => {
                              const workoutId = startWorkoutFromDay(
                                d,
                                d.id,
                                session.user.id,
                              );
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
      {renderFloating()}
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // Canvas lives on the ScrollView itself — there's no wrapper View to paint.
    scroll: { flex: 1, backgroundColor: theme.colors.canvas },
    content: {
      padding: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    contentWithFloating: { paddingBottom: MINIMIZED_BAR_CLEARANCE + 96 },
    phaseLabel: { ...theme.type.label, color: theme.colors.inkMuted },
    messageCard: { gap: theme.spacing.sm },
    messageTitle: { ...theme.type.heading, color: theme.colors.ink },
    messageBody: { ...theme.type.body, color: theme.colors.inkMuted },
  });
