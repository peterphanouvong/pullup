import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/styles/use-theme';
import { ExercisePicker } from '@/features/workouts/components/exercise-picker';
import { addExerciseToWorkout, replaceExercise } from '@/features/workouts/hooks';
import type { Exercise } from '@/features/workouts/types';
import { haptics } from '@/lib/haptics';
import { useSession } from '@/lib/auth';

// Module-level so the identity is stable: an inline literal would re-run
// setOptions on every render. The bar itself is the app's (see
// `styles/header.ts`); a sheet needs its own way out, which is the toolbar
// button below.
const SCREEN_OPTIONS = { presentation: 'modal' } as const;

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
  const theme = useTheme();

  function handlePick(exercise: Exercise) {
    if (mode === 'replace' && workoutExerciseId) {
      replaceExercise(workoutExerciseId, exercise);
    } else {
      addExerciseToWorkout(workoutId, session.user.id, exercise);
    }
    router.back();
  }

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <Stack.Title>{mode === 'replace' ? 'Replace Exercise' : 'Add Exercise'}</Stack.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="xmark"
          accessibilityLabel="Close"
          hidesSharedBackground
          tintColor={theme.colors.ink}
          onPress={() => {
            haptics.tap();
            router.back();
          }}
        />
      </Stack.Toolbar>
      <ExercisePicker onPick={handlePick} />
    </>
  );
}
