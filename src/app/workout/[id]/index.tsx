import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { ExerciseCard } from '@/features/workouts/components/exercise-card';
import { openExercisePicker } from '@/features/workouts/components/exercise-menu';
import { RestTimerBar } from '@/features/workouts/components/rest-timer-bar';
import { WorkoutHeader } from '@/features/workouts/components/workout-header';
import { discardWorkout, finishWorkout, useWorkout } from '@/features/workouts/hooks';
import { completedSetCount, workoutVolumeKg } from '@/features/workouts/selectors';

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workout, exercises } = useWorkout(id);
  const styles = useThemedStyles(createStyles);

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
    <Screen>
      <Stack.Screen options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <WorkoutHeader
          workout={workout}
          volumeKg={volumeKg}
          completedCount={completedCount}
          onFinish={handleFinish}
          onDiscard={handleDiscard}
        />

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
            style={({ pressed }) => [styles.addExercise, pressed && styles.addExercisePressed]}
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
  // Quiet outlined CTA (not a filled PrimaryButton pill) — the editing
  // surface's own affordance, kept visually subordinate to the header's
  // accent-filled "Finish" button, Hevy-style.
  addExercise: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.accent,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  addExercisePressed: { opacity: 0.7 },
  addExerciseLabel: { ...theme.type.heading, color: theme.colors.accent },
});
