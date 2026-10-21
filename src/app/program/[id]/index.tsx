import { ScrollView, StyleSheet, Text } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { Card } from '@/components/ui/card';
import { PrimaryButton } from '@/components/ui/primary-button';
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
        message="Couldn't load this program."
        onRetry={() => program.refetch()}
      />
    );
  }

  const data = program.data;
  // Active whether you're looking at your instance or the template it came
  // from: either way, selecting again would only start a fresh copy.
  const isActive = active.data?.programId === data.id || active.data?.templateId === data.id;

  // `Stack.Title` rather than an options object: the composition
  // components memoize, so a title that changes with the data doesn't
  // re-configure the bar on every render.
  //
  // No wrapper view either — the bar is transparent, and UIKit only finds
  // the ScrollView to draw its scroll-edge effect over when that view is
  // the screen's first subview.
  return (
    <>
      <Stack.Title>{data.name}</Stack.Title>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.summary}>{data.summary}</Text>

        <PrimaryButton
          title={isActive ? '✓ Your program' : select.isPending ? 'Selecting…' : 'Make this my program'}
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

        <SectionLabel>About this program</SectionLabel>
        <Markdown>{data.description}</Markdown>
      </ScrollView>
    </>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  summary: { ...theme.type.body, color: theme.colors.ink },
  error: { ...theme.type.body, color: theme.colors.danger },
  body: { ...theme.type.body, color: theme.colors.ink },
  timelineCard: { gap: theme.spacing.xs },
  weekCard: { gap: theme.spacing.xs },
  weekName: { ...theme.type.heading, color: theme.colors.ink },
});
