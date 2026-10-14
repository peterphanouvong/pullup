import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { Screen } from '@/components/ui/screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ExerciseTable } from '@/features/programs/components/exercise-table';
import { Markdown } from '@/features/programs/components/markdown';
import { QueryFallback } from '@/features/programs/components/query-fallback';
import { useActiveProgram, useProgram } from '@/features/programs/hooks';
import { useSession } from '@/lib/auth';
import { startWorkoutFromDay, useActiveWorkout } from '@/features/workouts/hooks';
import { startWorkoutOrPrompt } from '@/features/workouts/start-guard';

export default function DayScreen() {
  const { id, dayId } = useLocalSearchParams<{ id: string; dayId: string }>();
  const program = useProgram(id);
  const active = useActiveProgram();
  const session = useSession();
  const styles = useThemedStyles(createStyles);
  const activeWorkout = useActiveWorkout();

  if (program.isPending || program.isError) {
    return (
      <QueryFallback
        isError={program.isError}
        message="Couldn't load this day."
        onRetry={() => program.refetch()}
      />
    );
  }

  const day = program.data.weeks.flatMap((w) => w.days).find((d) => d.id === dayId);
  if (!day) {
    return (
      <Screen>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Day not found.</Text>
        </View>
      </Screen>
    );
  }

  const isActiveProgram = active.data?.programId === id;

  function handleStart() {
    startWorkoutOrPrompt(activeWorkout, () => {
      const workoutId = startWorkoutFromDay(day!, dayId, session.user.id);
      router.push(`/workout/${workoutId}`);
    });
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: day.name }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {day.notes != null && <Markdown>{day.notes}</Markdown>}
        <ExerciseTable exercises={day.exercises} />
        {day.kind === 'lifting' && isActiveProgram && (
          <PrimaryButton title="Start workout" onPress={handleStart} />
        )}
      </ScrollView>
    </Screen>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  content: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { ...theme.type.body, color: theme.colors.ink },
});
