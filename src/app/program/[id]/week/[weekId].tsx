import { ScrollView, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { DayRow } from '@/features/programs/components/day-row';
import { Markdown } from '@/features/programs/components/markdown';
import { QueryFallback } from '@/features/programs/components/query-fallback';
import { useProgram } from '@/features/programs/hooks';

export default function WeekScreen() {
  const { id, weekId } = useLocalSearchParams<{ id: string; weekId: string }>();
  const program = useProgram(id);

  if (program.isPending || program.isError) {
    return (
      <QueryFallback
        isError={program.isError}
        message="Couldn't load this week."
        onRetry={() => program.refetch()}
      />
    );
  }

  const week = program.data.weeks.find((w) => w.id === weekId);
  if (!week) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Week not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: week.name }} />
      <Text style={styles.phase}>{week.phase}</Text>
      {week.description != null && <Markdown>{week.description}</Markdown>}
      {week.days.map((day) => (
        <DayRow
          key={day.id}
          day={day}
          onPress={() => router.push(`/program/${id}/day/${day.id}`)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  scroll: { flex: 1, backgroundColor: theme.colors.canvas },
  container: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  phase: { ...theme.type.heading, color: theme.colors.accent },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.canvas,
  },
  emptyText: { ...theme.type.body, color: theme.colors.ink },
}));
