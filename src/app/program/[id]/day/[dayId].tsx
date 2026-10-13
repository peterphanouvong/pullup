import { Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ExerciseTable } from '@/features/programs/components/exercise-table';
import { Markdown } from '@/features/programs/components/markdown';
import { QueryFallback } from '@/features/programs/components/query-fallback';
import { useProgram } from '@/features/programs/hooks';

export default function DayScreen() {
  const { id, dayId } = useLocalSearchParams<{ id: string; dayId: string }>();
  const program = useProgram(id);

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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Day not found.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: day.name }} />
      {day.notes != null && (
        <View style={{ padding: 16 }}>
          <Markdown>{day.notes}</Markdown>
        </View>
      )}
      <ExerciseTable exercises={day.exercises} />
    </View>
  );
}
