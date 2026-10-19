import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { NativeButton } from '@/components/ui/native-button';
import { haptics } from '@/lib/haptics';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { celebrationCopy, formatCountdown } from '@/features/workouts/celebration';
import { ShareCard } from '@/features/workouts/components/share-card';
import { useActiveProgram, useProgram } from '@/features/programs/hooks';
import { useMyCrews } from '@/features/crews/hooks';
import { currentProgramPosition, nextCompDay } from '@/features/programs/schedule';
import { useWeekCompletion, useWorkout } from '@/features/workouts/hooks';
import { formatWorkoutDuration, workoutSummary } from '@/features/workouts/selectors';

const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function formatBestSet(
  bestSet: { weight_kg: number | null; reps: number | null; duration_seconds: number | null } | null,
): string {
  if (!bestSet) return '—';
  if (bestSet.weight_kg != null && bestSet.reps != null) return `${bestSet.weight_kg} kg × ${bestSet.reps}`;
  if (bestSet.duration_seconds != null) return `${bestSet.duration_seconds}s`;
  if (bestSet.reps != null) return `${bestSet.reps} reps`;
  return '—';
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const weekday = WEEKDAY_LABELS[(d.getDay() + 6) % 7];
  return `${weekday} ${d.getDate()}/${d.getMonth() + 1}`;
}

/**
 * The moment after finishing. Three beats, staged rather than all at once:
 * the time you just put in, what it did to the week, then the artefact you
 * can post.
 *
 * Deliberately not confetti-first. Pull Up is an eight-week peak aimed at
 * one competition, so the reward that means something is the countdown
 * moving — the hero numeral lands, the context line says where you are in
 * the peak, and the share card carries that countdown as its kicker.
 *
 * Reached from the Save step, which pops itself and `replace`s the workout
 * screen with this one; Done `replace`s too, so the finished workout never
 * sits behind this on the back stack.
 */
export default function WorkoutSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workout, exercises } = useWorkout(id);
  const crewCount = useMyCrews().data?.length ?? 0;
  const styles = useThemedStyles(createStyles);
  const active = useActiveProgram();
  const program = useProgram(active.data?.programId ?? '');
  const cardRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);

  // Staged entrance: the numeral arrives first and alone, then everything
  // under it. One orchestrated moment beats three competing animations.
  // Lazy state, not a ref: these are read during render to build styles,
  // and the compiler's lint forbids reading refs there. The initialiser
  // runs once, so the values stay stable across renders.
  const [heroAnim] = useState(() => new Animated.Value(0));
  const [restAnim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(heroAnim, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.back(1.6)),
      useNativeDriver: true,
    }).start(({ finished }) => {
      // The numeral lands with a knock you can feel: the save already
      // played success, this is the number arriving.
      if (finished) haptics.complete();
      Animated.timing(restAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
  }, [heroAnim, restAnim]);

  // Week context for the copy: how far this session got us, and how close
  // the competition is. Hooks stay unconditional, so this runs before the
  // not-found branch.
  const week = (() => {
    const data = program.data;
    const startDate = active.data?.startDate;
    if (!data || !startDate) return null;
    const position = currentProgramPosition(startDate, new Date(), data.weeks.length);
    const current = data.weeks.find((w) => w.position === position.week) ?? null;
    const comp = nextCompDay(data.weeks, position, startDate, new Date());
    return { week: current, daysToComp: comp?.daysAway ?? null };
  })();
  const liftingDays = (week?.week?.days ?? []).filter((d) => d.kind === 'lifting');
  const completion = useWeekCompletion(liftingDays.map((d) => d.id));

  if (!workout) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.notFound}>Workout not found.</Text>
      </Screen>
    );
  }

  const allSets = exercises.flatMap((e) => e.sets);
  const summary = workoutSummary(workout, exercises, allSets);
  const duration = formatWorkoutDuration(summary.durationSeconds);
  const copy = celebrationCopy({
    sessionsDone: liftingDays.filter((d) => completion[d.id]).length,
    sessionsPlanned: liftingDays.length,
    daysToComp: week?.daysToComp ?? null,
  });
  const finishedAt = workout.finished_at ?? workout.started_at;

  async function handleShare() {
    if (isSharing) return;
    haptics.tap();
    setIsSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share session' });
      }
    } catch {
      // Sharing is a bonus, never a blocker: a failed capture or a dismissed
      // sheet leaves the summary exactly as it was.
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.hero,
            {
              opacity: heroAnim,
              transform: [{ scale: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }],
            },
          ]}
        >
          <Text style={styles.heroNumeral}>{duration}</Text>
          <Text style={styles.heroLabel}>UNDER THE BAR</Text>
        </Animated.View>

        <Animated.View style={[styles.rest, { opacity: restAnim }]}>
          <View style={styles.copy}>
            <Text style={styles.headline}>{copy.headline}</Text>
            <Text style={styles.detail}>{copy.detail}</Text>
            {/* The check-in is automatic; say so, once, so it's never a
                surprise what the crew can see. */}
            {crewCount > 0 && (
              <Text style={styles.detail}>
                {crewCount === 1 ? 'Your crew can see you trained today.' : 'Your crews can see you trained today.'}
              </Text>
            )}
          </View>

          <View style={styles.cardWrap}>
            <ShareCard
              ref={cardRef}
              weekday={WEEKDAY_LABELS[(new Date(finishedAt).getDay() + 6) % 7]}
              title={workout.title}
              dateLabel={formatDateLabel(finishedAt)}
              stats={{ duration, volumeKg: summary.volumeKg, sets: summary.completedCount }}
              kicker={week?.daysToComp != null ? formatCountdown(week.daysToComp) : 'Session logged.'}
            />
          </View>

          <View style={styles.actions}>
            <NativeButton label={isSharing ? 'Preparing…' : 'Share'} onPress={handleShare} />
            <NativeButton label="Done" onPress={() => router.replace('/')} variant="primary" />
          </View>

          {summary.perExercise.length > 0 && (
            <View style={styles.list}>
              <SectionLabel>BEST SETS</SectionLabel>
              {summary.perExercise.map((item) => (
                <View key={item.exerciseName} style={styles.row}>
                  <Text style={styles.exerciseName} numberOfLines={1}>
                    {item.exerciseName}
                  </Text>
                  <Text style={styles.bestSet}>{formatBestSet(item.bestSet)}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  notFound: { ...theme.type.body, color: theme.colors.ink, padding: theme.spacing.lg },
  hero: { alignItems: 'center', paddingTop: theme.spacing.xxl, gap: theme.spacing.xs },
  // The one piece of boldness on the screen; everything else stays quiet.
  heroNumeral: {
    ...theme.type.numeralXL,
    fontSize: 64,
    color: theme.colors.ink,
    fontVariant: ['tabular-nums'],
  },
  heroLabel: { ...theme.type.label, color: theme.colors.inkMuted },
  rest: { gap: theme.spacing.lg },
  copy: { alignItems: 'center', gap: theme.spacing.xs },
  headline: { ...theme.type.title, color: theme.colors.ink },
  detail: { ...theme.type.body, color: theme.colors.inkMuted },
  cardWrap: { alignItems: 'center', paddingVertical: theme.spacing.sm },
  actions: { gap: theme.spacing.sm },
  list: { gap: theme.spacing.xs },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  exerciseName: { ...theme.type.body, color: theme.colors.ink, flex: 1, marginRight: theme.spacing.sm },
  bestSet: { ...theme.type.body, color: theme.colors.inkMuted, fontVariant: ['tabular-nums'] },
});
