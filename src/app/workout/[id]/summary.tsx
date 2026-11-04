import { type RefObject, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { NativeButton } from '@/components/ui/native-button';
import { haptics } from '@/lib/haptics';
import { useSession } from '@/lib/auth';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { ShaderScrollView } from '@/features/backdrop/shader-scroll-view';
import { DEFAULT_WEEKLY_TARGET } from '@/features/account/api';
import { useProfile } from '@/features/account/hooks';
import { useCrewWeek, useMyCrews } from '@/features/crews/hooks';
import { sessionsThisWeek, trainedDaysThisWeek, weekStreak } from '@/features/crews/streak';
import { crewWeekRange } from '@/features/crews/week';
import { celebrationCopy, crewLine, formatCountdown, streakKicker } from '@/features/workouts/celebration';
import { ConsistencyCard } from '@/features/workouts/components/consistency-card';
import { ShareCard } from '@/features/workouts/components/share-card';
import { useActiveProgram, useProgram } from '@/features/programs/hooks';
import { currentProgramPosition, nextCompDay } from '@/features/programs/schedule';
import { useMyLogbook } from '@/features/stats/hooks';
import { useMyAvatar } from '@/features/sticker/hooks';
import { useWeekCompletion, useWorkout } from '@/features/workouts/hooks';
import { formatWorkoutDuration, workoutSummary } from '@/features/workouts/selectors';

const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

// Just finished: a full-screen moment you can't swipe out of; Done leaves.
const CELEBRATE_OPTIONS = { headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false } as const;
// Looking back at a session from Profile or Activity: an ordinary pushed
// screen with the app's bar and the back gesture.
const VIEW_OPTIONS = { headerShown: true, gestureEnabled: true } as const;

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
 * The moment after finishing, and the overview of any past session.
 *
 * Finishing is staged rather than all at once: the time you just put in,
 * then what it did to the week. The week is the point: Pull Up is about
 * showing up consistently, with people, towards one competition, so the
 * card under the numeral is the week's seven dots, the streak and who in
 * the crew has trained too, with the comp countdown in the copy. Then the
 * artefact you can post, and the best sets.
 *
 * Reached from the Save step, which pops itself and `replace`s the workout
 * screen with this one; Done `replace`s too, so the finished workout never
 * sits behind this on the back stack. With `view=1` (or `share=1`) it's
 * the same screen as a plain push: bar, back gesture, no Done, and the
 * week card left out, since "this week" would be about now, not then.
 */
/** Captures the share card as an image and opens the share sheet. Sharing
 * is a bonus, never a blocker: a failed capture or a dismissed sheet leaves
 * the summary exactly as it was. */
async function shareCardImage(cardRef: RefObject<View | null>): Promise<void> {
  try {
    const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share session' });
    }
  } catch {
    // See above.
  }
}

export default function WorkoutSummaryScreen() {
  // `share=1`: opened from a share button elsewhere (a profile's session
  // card), so the sheet comes straight up once the card has laid out.
  const { id, share, view } = useLocalSearchParams<{ id: string; share?: string; view?: string }>();
  const viewing = share === '1' || view === '1';
  const { workout, exercises } = useWorkout(id);
  const session = useSession();
  const styles = useThemedStyles(createStyles);
  const active = useActiveProgram();
  const program = useProgram(active.data?.programId ?? '');
  const profile = useProfile();
  const book = useMyLogbook();
  const avatarUri = useMyAvatar();
  const crews = useMyCrews();
  const crewCount = crews.data?.length ?? 0;
  const firstCrew = crews.data?.[0] ?? null;
  const [now] = useState(() => new Date());
  const insets = useSafeAreaInsets();
  // Only the first crew: one line, not a league table.
  const crewWeek = useCrewWeek(firstCrew?.id ?? '', crewWeekRange(now));
  const cardRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);

  // Staged entrance: the numeral arrives first and alone, then everything
  // under it. One orchestrated moment beats three competing animations.
  // Looking back skips the theatre and opens settled.
  // Lazy state, not a ref: these are read during render to build styles,
  // and the compiler's lint forbids reading refs there. The initialiser
  // runs once, so the values stay stable across renders.
  const [heroAnim] = useState(() => new Animated.Value(viewing ? 1 : 0));
  const [restAnim] = useState(() => new Animated.Value(viewing ? 1 : 0));
  useEffect(() => {
    if (viewing) return;
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
  }, [heroAnim, restAnim, viewing]);

  const hasWorkout = workout != null;
  useEffect(() => {
    if (share !== '1' || !hasWorkout) return;
    const handle = setTimeout(() => void shareCardImage(cardRef), 600);
    return () => clearTimeout(handle);
  }, [share, hasWorkout]);

  // Week context for the copy: how far this session got us, and how close
  // the competition is. Hooks stay unconditional, so this runs before the
  // not-found branch.
  const week = (() => {
    const data = program.data;
    const startDate = active.data?.startDate;
    if (!data || !startDate) return null;
    const position = currentProgramPosition(startDate, now, data.weeks.length);
    const current = data.weeks.find((w) => w.position === position.week) ?? null;
    const comp = nextCompDay(data.weeks, position, startDate, now);
    return { week: current, daysToComp: comp?.daysAway ?? null };
  })();
  const liftingDays = (week?.week?.days ?? []).filter((d) => d.kind === 'lifting');
  const completion = useWeekCompletion(liftingDays.map((d) => d.id));

  if (!workout) {
    return (
      <Screen>
        <Stack.Screen options={CELEBRATE_OPTIONS} />
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

  // Consistency, from the logbook (which already includes this session).
  const target = profile.data?.weeklyTarget ?? DEFAULT_WEEKLY_TARGET;
  const starts = book.workouts.map((w) => w.started_at);
  const streak = weekStreak(starts, target, now);
  const crewText =
    firstCrew != null && crewWeek.data != null
      ? crewLine(
          crewWeek.data
            .filter((m) => m.userId !== session.user.id && m.sessionCount > 0)
            .map((m) => m.displayName),
        )
      : null;

  async function handleShare() {
    if (isSharing) return;
    haptics.tap();
    setIsSharing(true);
    await shareCardImage(cardRef);
    setIsSharing(false);
  }

  const content = (
    // The finish is the one screen whose backdrop moves: the field drifts
    // under the numeral while it lands. Looking back, it's still.
    <ShaderScrollView
      vibe="celebration"
      animated={!viewing}
      style={styles.scroll}
      contentContainerStyle={[styles.content, !viewing && { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior={viewing ? 'automatic' : 'never'}
    >
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
        {viewing ? (
          <Text style={styles.viewDate}>{formatDateLabel(finishedAt)}</Text>
        ) : (
          <>
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

            <ConsistencyCard
              days={trainedDaysThisWeek(starts, now)}
              todayIndex={(now.getDay() + 6) % 7}
              sessions={sessionsThisWeek(starts, now)}
              target={target}
              streak={streak}
              crewLine={crewText}
            />
          </>
        )}

        <View style={styles.cardWrap}>
          <ShareCard
            ref={cardRef}
            weekday={WEEKDAY_LABELS[(new Date(finishedAt).getDay() + 6) % 7]}
            title={workout.title}
            dateLabel={formatDateLabel(finishedAt)}
            stats={{ duration, volumeKg: summary.volumeKg, sets: summary.completedCount }}
            kicker={week?.daysToComp != null ? formatCountdown(week.daysToComp) : streakKicker(streak)}
            avatarUri={avatarUri}
          />
        </View>

        <View style={styles.actions}>
          <NativeButton
            label={isSharing ? 'Preparing…' : 'Share'}
            onPress={handleShare}
            variant={viewing ? 'secondary' : undefined}
          />
          {!viewing && <NativeButton label="Done" onPress={() => router.replace('/')} variant="primary" />}
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
    </ShaderScrollView>
  );

  if (viewing) {
    // No wrapper view: the bar is transparent, and UIKit only finds the
    // ScrollView to draw its scroll-edge effect over when that view is the
    // screen's first subview.
    return (
      <>
        <Stack.Screen options={VIEW_OPTIONS} />
        <Stack.Title>{workout.title}</Stack.Title>
        {content}
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={CELEBRATE_OPTIONS} />
      {content}
    </>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.canvas },
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
  viewDate: { ...theme.type.caption, color: theme.colors.inkMuted, textAlign: 'center' },
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
