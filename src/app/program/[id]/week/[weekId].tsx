import { ScrollView, Text, View } from 'react-native';
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Week not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Stack.Screen options={{ title: week.name }} />
      <Text>{week.phase}</Text>
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
