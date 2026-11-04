import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { ExerciseCard } from '@/features/workouts/components/exercise-card';
import { openExercisePicker } from '@/features/workouts/components/exercise-menu';
import { RestTimerBar } from '@/features/workouts/components/rest-timer-bar';
import { FILL_BAR_CLEARANCE, FillDownBar } from '@/features/workouts/components/fill-down-bar';
import {
  HEADER_CHEVRON_SIZE,
  HeaderIconButton,
  HeaderMenuButton,
  HeaderPrimaryButton,
} from '@/features/workouts/components/header-buttons';
import { WorkoutHeaderTitle } from '@/features/workouts/components/workout-header';
import { WorkoutSkeleton } from '@/features/workouts/components/workout-skeleton';
import { NativeButton } from '@/components/ui/native-button';
import { haptics } from '@/lib/haptics';
import { discardWorkout, renameWorkout, switchWorkoutVersion, useWorkout } from '@/features/workouts/hooks';
import { shortTitle, shortVersionOf } from '@/features/workouts/short-version';
import { useActiveProgramDay } from '@/features/programs/hooks';
import { completedSetCount, workoutVolumeKg } from '@/features/workouts/selectors';
import { ShaderScrollView } from '@/features/backdrop/shader-scroll-view';

// Module-level so the object identity is stable: expo-router's Stack.Screen
// calls navigation.setOptions whenever the `options` prop changes identity,
// and an inline literal does that on EVERY render — which re-configures the
// native header mid-animation. Everything else is declared with the
// composition components (Stack.Title/Header/Toolbar), which memoize.
/** Standard iOS navigation bar height — the transparent header's footprint. */
const HEADER_HEIGHT = 44;

// `title: ''`: the name is drawn as a left bar item next to the chevron
// (see WorkoutHeaderTitle), so the centred title slot stays empty.
const MODAL_OPTIONS = { presentation: 'fullScreenModal', title: '' } as const;

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workout, exercises } = useWorkout(id);
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  // The modal's open animation and the first render of a full exercise list
  // compete for the same frames, which read as a stall between tapping
  // Start and seeing the screen. Render a skeleton first and mount the real
  // (SwiftUI-hosting) cards once the transition has finished.

  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);

  /** Scrolls the focused set input up until it clears the fill-down bar.
   * The ScrollView's automatic keyboard inset only knows about the
   * keyboard, so on its own it parks the input right under the bar. */
  const revealFocusedInput = useCallback((keyboardTop: number) => {
    TextInput.State.currentlyFocusedInput()?.measureInWindow((_x, y, _w, height) => {
      const overlap = y + height + FILL_BAR_CLEARANCE - keyboardTop;
      if (overlap > 0) scrollRef.current?.scrollTo({ y: scrollY.current + overlap, animated: true });
    });
  }, []);

  // The full/short switch: only for a lifting day of the active programme.
  const day = useActiveProgramDay(workout?.program_day_id ?? null);
  const short = day?.kind === 'lifting' ? shortVersionOf(day) : null;

  const [contentReady, setContentReady] = useState(false);
  useEffect(() => {
    // A short timer rather than InteractionManager (deprecated): long enough
    // for the modal's open animation to get its frames, short enough that
    // the skeleton never reads as a wait.
    const handle = setTimeout(() => setContentReady(true), 180);
    return () => clearTimeout(handle);
  }, []);

  if (!workout) {
    return (
      <Screen topInset={false}>
        {/* Same options as the loaded state: toggling headerShown inside a
            modal remounts the screen and loses local state. */}
        <Stack.Screen options={MODAL_OPTIONS} />
        <Text style={[styles.notFound, { paddingTop: insets.top + HEADER_HEIGHT }]}>
          Workout not found.
        </Text>
      </Screen>
    );
  }

  const allSets = exercises.flatMap((e) => e.sets);
  const volumeKg = workoutVolumeKg(allSets);
  const completedCount = completedSetCount(allSets);
  const liveSetCount = allSets.filter((s) => !s.deleted).length;

  const isShort = day != null && short != null && workout.title === shortTitle(day, short);

  function goHome() {
    router.replace('/');
  }

  function goToSave() {
    router.push(`/workout/${id}/save`);
  }

  /** Finish heads to the Save step. With nothing ticked off there's nothing
   * to save, so it suggests discarding first — but still lets you save, in
   * case you logged the numbers and forgot the ticks. */
  function handleFinish() {
    if (completedCount === 0) {
      haptics.warning();
      Alert.alert('No sets completed', 'Nothing has been ticked off yet. Discard this workout?', [
        { text: 'Keep logging', style: 'cancel' },
        { text: 'Save anyway', onPress: goToSave },
        {
          text: 'Discard workout',
          style: 'destructive',
          onPress: () => {
            discardWorkout(id);
            goHome();
          },
        },
      ]);
      return;
    }
    haptics.commit();
    goToSave();
  }

  return (
    <>
      {/* Native navigation bar via expo-router's composition components
          (SF Symbols, liquid-glass backgrounds on iOS 26): chevron.down
          dismisses the modal downward — the workout keeps running and the
          minimized bar picks it up on Today — the hourglass switches between
          the full and short versions, and Finish opens the Save step. */}
      <Stack.Screen options={MODAL_OPTIONS} />
      {/* Transparent bar, same as the Programme tab: no material of its
          own, so iOS draws its soft scroll-edge effect as content passes
          under. That effect needs the ScrollView to be the screen's first
          subview, which is why there's no wrapper below. */}
      <Stack.Header transparent style={{ color: theme.colors.ink, shadowColor: 'transparent' }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.View hidesSharedBackground>
          {/* Chevron, then the name with the live stats as its subtitle.
              Left-aligned so the right-hand buttons can't cover it. */}
          <View style={styles.leading}>
            <HeaderIconButton
              icon="chevron.down"
              iconSize={HEADER_CHEVRON_SIZE}
              size="large"
              accessibilityLabel="Minimize workout"
              onPress={() => {
                haptics.tap();
                router.back();
              }}
            />
            <WorkoutHeaderTitle
              workout={workout}
              volumeKg={volumeKg}
              completedCount={completedCount}
              totalCount={liveSetCount}
            />
          </View>
        </Stack.Toolbar.View>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        {/* One bar item for both: every separate item adds UIKit's own
            spacing, and when the row overflows iOS silently drops the last
            item — that's how Finish disappeared once the title moved left. */}
        <Stack.Toolbar.View hidesSharedBackground>
          <View style={styles.trailing}>
            {/* The session's menu: rename it, and, for a programme day,
                switch between the full and short versions. Switching is
                a menu action rather than a tap since it drops unticked
                sets; ticked ones stay either way. */}
            <HeaderMenuButton
              icon={isShort ? 'hourglass.bottomhalf.filled' : 'ellipsis'}
              accessibilityLabel="Workout options"
              actions={[
                {
                  label: 'Rename workout',
                  icon: 'pencil',
                  onPress: () =>
                    Alert.prompt(
                      'Workout name',
                      undefined,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Save', onPress: (value?: string) => renameWorkout(workout.id, value ?? '') },
                      ],
                      'plain-text',
                      workout.title,
                    ),
                },
                ...(day != null && short != null
                  ? [
                      isShort
                        ? { label: 'Switch to the full workout', icon: 'arrow.up.left.and.arrow.down.right' as const, onPress: () => switchWorkoutVersion(workout.id, day, false) }
                        : { label: `Short on time? Switch to ${short.minutes} min`, icon: 'hourglass' as const, onPress: () => switchWorkoutVersion(workout.id, day, true) },
                    ]
                  : []),
              ]}
            />
            <HeaderPrimaryButton label="Finish" onPress={handleFinish} />
          </View>
        </Stack.Toolbar.View>
      </Stack.Toolbar>
      {/* First subview: see the header note above. */}
      {contentReady ? (
        <ShaderScrollView
          vibe="workout"
          ref={scrollRef}
          onScroll={(e) => {
            scrollY.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          style={styles.scroll}
          // Insets for the transparent header and the keyboard come from
          // the native scroll view, replacing the old padded wrapper and
          // KeyboardAvoidingView (which hid it from the header).
          contentInsetAdjustmentBehavior="automatic"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {exercises.length === 0 && <Text style={styles.empty}>No exercises yet — add one to get started.</Text>}
          {exercises.map((exercise, index) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              workoutId={workout.id}
              canMoveUp={index > 0}
              canMoveDown={index < exercises.length - 1}
            />
          ))}
          <NativeButton
            label="Add Exercise"
            systemImage="plus"
            onPress={() => openExercisePicker(workout.id, 'add')}
          />
        </ShaderScrollView>
      ) : (
        <View style={[styles.scroll, { paddingTop: insets.top + HEADER_HEIGHT }]}>
          <WorkoutSkeleton exerciseCount={exercises.length} />
        </View>
      )}

      <RestTimerBar />
      <FillDownBar onReveal={revealFocusedInput} />
    </>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.canvas },
  leading: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  notFound: { ...theme.type.body, color: theme.colors.ink, padding: theme.spacing.lg },
  empty: { ...theme.type.body, color: theme.colors.inkMuted, textAlign: 'center', paddingTop: theme.spacing.xl },
});
