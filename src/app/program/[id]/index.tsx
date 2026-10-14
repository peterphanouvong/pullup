import { ScrollView, StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BackRow } from '@/components/ui/back-row';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { Card } from '@/components/ui/card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { Markdown } from '@/features/programs/components/markdown';
import { QueryFallback } from '@/features/programs/components/query-fallback';
import { buildPhaseTimeline } from '@/features/programs/mapping';
import { useActiveProgram, useProgram, useSelectProgram } from '@/features/programs/hooks';

export default function ProgramOverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const program = useProgram(id);
  const active = useActiveProgram();
  const select = useSelectProgram();
  const styles = useThemedStyles(createStyles);

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
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BackRow title={data.name} />
        <Text style={styles.summary}>{data.summary}</Text>

        <PrimaryButton
          title={isActive ? '✓ Your programme' : select.isPending ? 'Selecting…' : 'Make this my programme'}
          disabled={isActive}
          loading={select.isPending}
          onPress={() => select.mutate({ programId: data.id })}
        />
        {select.isError && <Text style={styles.error}>Couldn&apos;t select — try again.</Text>}

        <SectionLabel>Timeline</SectionLabel>
        <Card style={styles.timelineCard}>
          {buildPhaseTimeline(data.weeks).map((entry) => (
            <Text key={entry.weekName} style={styles.body}>
              {entry.weekName} — {entry.phase}
              {entry.compDayName ? `  ·  ${entry.compDayName}` : ''}
            </Text>
          ))}
        </Card>

        <SectionLabel>Weeks</SectionLabel>
        {data.weeks.map((week) => (
          <Card
            key={week.id}
            style={styles.weekCard}
            onPress={() => router.push(`/program/${data.id}/week/${week.id}`)}
          >
            <Text style={styles.weekName}>{`${week.name} (${week.phase})`}</Text>
          </Card>
        ))}

        <SectionLabel>About this programme</SectionLabel>
        <Markdown>{data.description}</Markdown>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  content: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  summary: { ...theme.type.body, color: theme.colors.ink },
  error: { ...theme.type.body, color: theme.colors.danger },
  body: { ...theme.type.body, color: theme.colors.ink },
  timelineCard: { gap: theme.spacing.xs },
  weekCard: { gap: theme.spacing.xs },
  weekName: { ...theme.type.heading, color: theme.colors.ink },
});
