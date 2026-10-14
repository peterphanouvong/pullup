import { ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native-unistyles';
import { Screen } from '@/components/ui/screen';
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
      <Screen>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Day not found.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: day.name }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {day.notes != null && <Markdown>{day.notes}</Markdown>}
        <ExerciseTable exercises={day.exercises} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { ...theme.type.body, color: theme.colors.ink },
}));
