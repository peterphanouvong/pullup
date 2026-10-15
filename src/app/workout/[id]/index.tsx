import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { ExerciseCard } from '@/features/workouts/components/exercise-card';
import { openExercisePicker, openStartRestSheet } from '@/features/workouts/components/exercise-menu';
import { RestTimerBar } from '@/features/workouts/components/rest-timer-bar';
import {
  HEADER_CHEVRON_SIZE,
  HeaderIconButton,
  HeaderPrimaryButton,
} from '@/features/workouts/components/header-buttons';
import { WorkoutHeaderTitle, WorkoutStatsRow } from '@/features/workouts/components/workout-header';
import { WorkoutSkeleton } from '@/features/workouts/components/workout-skeleton';
import { NativeButton } from '@/components/ui/native-button';
import { discardWorkout, useWorkout } from '@/features/workouts/hooks';
import { completedSetCount, workoutVolumeKg } from '@/features/workouts/selectors';

// Module-level so the object identity is stable: expo-router's Stack.Screen
// calls navigation.setOptions whenever the `options` prop changes identity,
// and an inline literal does that on EVERY render — which re-configures the
// native header mid-animation. Everything else is declared with the
// composition components (Stack.Title/Header/Toolbar), which memoize.
/** Standard iOS navigation bar height — the transparent header's footprint. */
const HEADER_HEIGHT = 44;

/** The stats strip's own height. It floats over the list rather than sitting
 * in flow, so the list pads itself by this much and the strip can slide away
 * without reflowing anything. */
const STATS_HEIGHT = 64;

/** Ignore scroll jitter below this many points, so the strip doesn't flicker
 * while a finger rests on the screen. */
const SCROLL_NOISE = 6;

const MODAL_OPTIONS = { presentation: 'fullScreenModal' } as const;

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
  // The stats strip gets out of the way as you work down the list and comes
  // back the moment you scroll up — the numbers matter between sets, not
  // while you're reading the next exercise.
  const [statsHidden] = useState(() => new Animated.Value(0));
  const statsHiddenRef = useRef(false);
  const lastScrollY = useRef(0);

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
    goToSave();
  }

  return (
    <>
      {/* Native navigation bar via expo-router's composition components
          (SF Symbols, liquid-glass backgrounds on iOS 26): chevron.down
          dismisses the modal downward — the workout keeps running and the
          minimized bar picks it up on Today — the timer starts a rest, and
          Finish opens the Save step. */}
      <Stack.Screen options={MODAL_OPTIONS} />
      {/* Custom title: the name, plus a compact stats line that takes over
          while the strip below is scrolled away (same animated value). */}
      <Stack.Title asChild>
        <WorkoutHeaderTitle
          workout={workout}
          volumeKg={volumeKg}
          completedCount={completedCount}
          totalCount={liveSetCount}
          reveal={statsHidden}
        />
      </Stack.Title>
      {/* Transparent bar, same as the Programme tab: no material of its
          own, so iOS draws its soft scroll-edge effect as content passes
          under. That effect needs the ScrollView to be the screen's first
          subview, which is why there's no wrapper below. */}
      <Stack.Header transparent style={{ color: theme.colors.ink, shadowColor: 'transparent' }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.View hidesSharedBackground>
          <HeaderIconButton
            icon="chevron.down"
            iconSize={HEADER_CHEVRON_SIZE}
            size="large"
            accessibilityLabel="Minimize workout"
            onPress={() => router.back()}
          />
        </Stack.Toolbar.View>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View hidesSharedBackground>
          <HeaderIconButton icon="timer" accessibilityLabel="Start rest timer" onPress={openStartRestSheet} />
        </Stack.Toolbar.View>
        <Stack.Toolbar.View hidesSharedBackground>
          <HeaderPrimaryButton label="Finish" onPress={handleFinish} />
        </Stack.Toolbar.View>
      </Stack.Toolbar>
      {/* First subview: see the header note above. */}
      {contentReady ? (
        <ScrollView
          style={styles.scroll}
          // Insets for the transparent header and the keyboard come from
          // the native scroll view, replacing the old padded wrapper and
          // KeyboardAvoidingView (which hid it from the header).
          contentInsetAdjustmentBehavior="automatic"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[styles.content, { paddingTop: STATS_HEIGHT + theme.spacing.lg }]}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={(e) => {
            // The native inset puts the resting offset at minus the header's
            // height; measure from the top of the content instead.
            const y = e.nativeEvent.contentOffset.y + insets.top + HEADER_HEIGHT;
            const delta = y - lastScrollY.current;
            if (Math.abs(delta) < SCROLL_NOISE) return;
            lastScrollY.current = y;
            // Only hide once there's something above to scroll back to.
            const hide = delta > 0 && y > STATS_HEIGHT;
            if (hide === statsHiddenRef.current) return;
            statsHiddenRef.current = hide;
            Animated.timing(statsHidden, {
              toValue: hide ? 1 : 0,
              duration: 180,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }).start();
          }}
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
        </ScrollView>
      ) : (
        <View style={[styles.scroll, { paddingTop: insets.top + HEADER_HEIGHT }]}>
          <WorkoutSkeleton exerciseCount={exercises.length} />
        </View>
      )}
      <Animated.View
        style={[
          styles.statsStrip,
          {
            // Absolute children measure from the parent's OUTER edge in
            // Yoga, ignoring its padding — without this the strip renders
            // behind the translucent header and is never seen.
            top: insets.top + HEADER_HEIGHT,
            transform: [
              {
                translateY: statsHidden.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -STATS_HEIGHT],
                }),
              },
            ],
            opacity: statsHidden.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          },
        ]}
      >
        <WorkoutStatsRow
          workout={workout}
          volumeKg={volumeKg}
          completedCount={completedCount}
          totalCount={liveSetCount}
        />
      </Animated.View>

      <RestTimerBar />
    </>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.canvas },
  // Floats over the list (absolute, so sliding it away reflows nothing) and
  // is opaque so rows pass cleanly underneath.
  statsStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: theme.colors.canvas,
  },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  notFound: { ...theme.type.body, color: theme.colors.ink, padding: theme.spacing.lg },
  empty: { ...theme.type.body, color: theme.colors.inkMuted, textAlign: 'center', paddingTop: theme.spacing.xl },
});
