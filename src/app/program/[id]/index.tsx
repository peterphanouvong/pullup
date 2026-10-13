import { Button as UIButton, Host } from '@expo/ui';
import { Button, ScrollView, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Markdown } from '@/features/programs/components/markdown';
import { QueryFallback } from '@/features/programs/components/query-fallback';
import { buildPhaseTimeline } from '@/features/programs/mapping';
import { useActiveProgram, useProgram, useSelectProgram } from '@/features/programs/hooks';

export default function ProgramOverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const program = useProgram(id);
  const active = useActiveProgram();
  const select = useSelectProgram();

  if (program.isPending || program.isError) {
    return (
      <QueryFallback
        isError={program.isError}
        message="Couldn't load this programme."
        onRetry={() => program.refetch()}
      />
    );
  }

  const data = program.data;
  const isActive = active.data?.programId === data.id;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
      <Stack.Screen options={{ title: data.name }} />
      <Text>{data.summary}</Text>

      <Host matchContents>
        <UIButton
          disabled={isActive || select.isPending}
          label={isActive ? '✓ Your programme' : select.isPending ? 'Selecting…' : 'Make this my programme'}
          onPress={() => select.mutate({ programId: data.id })}
        />
      </Host>
      {select.isError && <Text>Couldn&apos;t select — try again.</Text>}

      <Section title="Timeline">
        {buildPhaseTimeline(data.weeks).map((entry) => (
          <Text key={entry.weekName}>
            {entry.weekName} — {entry.phase}
            {entry.compDayName ? `  ·  ${entry.compDayName}` : ''}
          </Text>
        ))}
      </Section>

      <Section title="Weeks">
        {data.weeks.map((week) => (
          <Button
            key={week.id}
            title={`${week.name} (${week.phase})`}
            onPress={() => router.push(`/program/${data.id}/week/${week.id}`)}
          />
        ))}
      </Section>

      <Section title="About this programme">
        <Markdown>{data.description}</Markdown>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>{title}</Text>
      {children}
    </View>
  );
}
