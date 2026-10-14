import { StyleSheet, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { IconCircle } from '@/components/ui/icon-circle';
import { Screen } from '@/components/ui/screen';
import { ScreenTitle } from '@/components/ui/screen-title';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { ExercisePicker } from '@/features/workouts/components/exercise-picker';
import { addExerciseToWorkout, replaceExercise } from '@/features/workouts/hooks';
import type { Exercise } from '@/features/workouts/types';
import { useSession } from '@/lib/auth';

/**
 * Modal route hosting the exercise picker, reused by both the "+ Add
 * Exercise" button (`mode: 'add'`) and the ⋮ menu's "Replace exercise…"
 * item (`mode: 'replace'`, `workoutExerciseId` set). Picking always dismisses
 * back to the workout screen.
 */
export default function PickerScreen() {
  const { workoutId, mode, workoutExerciseId } = useLocalSearchParams<{
    workoutId: string;
    mode: 'add' | 'replace';
    workoutExerciseId?: string;
  }>();
  const session = useSession();
  const styles = useThemedStyles(createStyles);

  function handlePick(exercise: Exercise) {
    if (mode === 'replace' && workoutExerciseId) {
      replaceExercise(workoutExerciseId, exercise);
    } else {
      addExerciseToWorkout(workoutId, session.user.id, exercise);
    }
    router.back();
  }

  return (
    <Screen>
      <Stack.Screen options={{ presentation: 'modal', headerShown: false }} />
      <View style={styles.header}>
        <ScreenTitle title={mode === 'replace' ? 'Replace Exercise' : 'Add Exercise'}>
          <IconCircle name="xmark" fallback="✕" onPress={() => router.back()} />
        </ScreenTitle>
      </View>
      <ExercisePicker onPick={handlePick} />
    </Screen>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  header: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md },
});
