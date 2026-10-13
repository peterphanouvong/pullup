import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
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
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Day not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: day.name }} />
      {day.notes != null && (
        <View style={styles.notes}>
          <Markdown>{day.notes}</Markdown>
        </View>
      )}
      <ExerciseTable exercises={day.exercises} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  notes: { padding: theme.spacing.lg },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
  },
  emptyText: { ...theme.type.body, color: theme.colors.text },
}));
