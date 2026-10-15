import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { IconCircle } from '@/components/ui/icon-circle';
import { Screen } from '@/components/ui/screen';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { ExerciseCard } from '@/features/workouts/components/exercise-card';
import { openExercisePicker } from '@/features/workouts/components/exercise-menu';
import { RestTimerBar } from '@/features/workouts/components/rest-timer-bar';
import { WorkoutStatsRow } from '@/features/workouts/components/workout-header';
import { discardWorkout, finishWorkout, useWorkout } from '@/features/workouts/hooks';
import { completedSetCount, workoutVolumeKg } from '@/features/workouts/selectors';

function FinishButton({ onPress }: { onPress: () => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable style={({ pressed }) => [styles.finishPill, pressed && styles.pressed]} onPress={onPress}>
      <Text style={styles.finishLabel}>Finish</Text>
    </Pressable>
  );
}

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workout, exercises } = useWorkout(id);
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  if (!workout) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Text style={styles.notFound}>Workout not found.</Text>
      </Screen>
    );
  }

  const allSets = exercises.flatMap((e) => e.sets);
  const volumeKg = workoutVolumeKg(allSets);
  const completedCount = completedSetCount(allSets);

  function goHome() {
    router.replace('/');
  }

  function goToSummary() {
    router.replace(`/workout/${id}/summary`);
  }

  function handleFinish() {
    if (completedCount === 0) {
      Alert.alert('No sets completed', 'Discard this workout instead?', [
        { text: 'Keep logging', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            discardWorkout(id);
            goHome();
          },
        },
        {
          text: 'Finish anyway',
          onPress: () => {
            finishWorkout(id, new Date());
            goToSummary();
          },
        },
      ]);
      return;
    }
    finishWorkout(id, new Date());
    goToSummary();
  }

  function handleDiscard() {
    Alert.alert(
      'Discard workout?',
      "This removes the workout and everything logged in it. This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            discardWorkout(id);
            goHome();
          },
        },
      ],
    );
  }

  return (
    <Screen topInset={false}>
      {/* Native navigation bar: chevron.down dismisses the modal downward
          (the workout keeps running — the minimized bar picks it up on
          Today), trash discards, Finish completes. */}
      <Stack.Screen
        options={{
          headerShown: true,
          presentation: 'fullScreenModal',
          title: workout.title,
          headerStyle: { backgroundColor: theme.colors.canvas },
          headerShadowVisible: false,
          headerTintColor: theme.colors.ink,
          headerLeft: () => <IconCircle name="chevron.down" size={32} onPress={() => router.back()} />,
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconCircle name="trash" size={32} tint={theme.colors.danger} onPress={handleDiscard} />
              <FinishButton onPress={handleFinish} />
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
      >
        <WorkoutStatsRow workout={workout} volumeKg={volumeKg} completedCount={completedCount} />

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
          <Pressable
            style={({ pressed }) => [styles.addExercise, pressed && styles.pressed]}
            onPress={() => openExercisePicker(workout.id, 'add')}
          >
            <Text style={styles.addExerciseLabel}>+ Add Exercise</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      <RestTimerBar />
    </Screen>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  notFound: { ...theme.type.body, color: theme.colors.ink, padding: theme.spacing.lg },
  empty: { ...theme.type.body, color: theme.colors.inkMuted, textAlign: 'center', paddingTop: theme.spacing.xl },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  finishPill: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.pill,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  finishLabel: { ...theme.type.caption, color: theme.colors.onAccent, fontWeight: '700' },
  pressed: { opacity: 0.7 },
  // Quiet outlined CTA (not a filled PrimaryButton pill) — the editing
  // surface's own affordance, kept visually subordinate to the native
  // header's accent-filled "Finish" button, Hevy-style.
  addExercise: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.accent,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  addExerciseLabel: { ...theme.type.heading, color: theme.colors.accent },
});
