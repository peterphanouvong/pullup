import { ScrollView, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { NumeralRow } from '@/components/ui/numeral-row';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { Markdown } from '@/features/programs/components/markdown';
import { QueryFallback } from '@/features/programs/components/query-fallback';
import { useProgram } from '@/features/programs/hooks';
import type { DayKind, ProgramDay } from '@/features/programs/types';

const KIND_LABEL: Record<DayKind, string> = {
  lifting: 'Lifting session',
  court: 'Court session',
  rest: 'Rest day',
  comp: 'Competition day',
};

function subtitleFor(day: ProgramDay): string {
  if (day.notes) return day.notes;
  if (day.kind === 'lifting') {
    return `${day.exercises.length} exercise${day.exercises.length === 1 ? '' : 's'}`;
  }
  return KIND_LABEL[day.kind];
}

export default function WeekScreen() {
  const { id, weekId } = useLocalSearchParams<{ id: string; weekId: string }>();
  const program = useProgram(id);
  const { theme } = useUnistyles();

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
      <Screen>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Week not found.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: week.name }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionLabel>{week.phase}</SectionLabel>
        {week.description != null && <Markdown>{week.description}</Markdown>}
        {week.days.map((day) => {
          const tappable = day.kind === 'lifting' && day.exercises.length > 0;
          const numeralColor =
            day.kind === 'comp' ? theme.colors.comp : day.kind === 'rest' ? theme.colors.inkMuted : undefined;
          return (
            <NumeralRow
              key={day.id}
              numeral={day.position}
              caption={`DAY`}
              title={day.name}
              subtitle={subtitleFor(day)}
              numeralColor={numeralColor}
              onPress={tappable ? () => router.push(`/program/${id}/day/${day.id}`) : undefined}
            />
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { ...theme.type.body, color: theme.colors.ink },
}));
