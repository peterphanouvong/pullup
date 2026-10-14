import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { ExerciseCard } from '@/features/workouts/components/exercise-card';
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
    router.replace('/(tabs)');
  }

  function handleFinish() {
    if (completedCount === 0) {
      Alert.alert('No sets completed', 'Finish anyway, or discard this workout?', [
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
            goHome();
          },
        },
      ]);
      return;
    }
    finishWorkout(id, new Date());
    goHome();
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
        />

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {exercises.length === 0 && (
            <Text style={styles.empty}>No exercises yet. Add-exercise support is coming soon.</Text>
          )}
          {exercises.map((exercise) => (
            <ExerciseCard key={exercise.id} exercise={exercise} workoutId={workout.id} />
          ))}
          {/* Task 5 resume-banner / active-workout affordances land here on
              the Today tab, not this screen — nothing to slot in locally. */}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  notFound: { ...theme.type.body, color: theme.colors.ink, padding: theme.spacing.lg },
  empty: { ...theme.type.body, color: theme.colors.inkMuted, textAlign: 'center', paddingTop: theme.spacing.xl },
});
