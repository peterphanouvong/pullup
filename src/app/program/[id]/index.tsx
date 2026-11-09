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
import {
  useActiveProgram,
  useProgram,
  useProgramBrief,
  useProgramHistory,
  useResumeProgram,
  useSelectProgram,
} from '@/features/programs/hooks';
import { NativeButton } from '@/components/ui/native-button';
import { promptReworkOrBuild } from '@/features/onboarding/rework';

export default function ProgramOverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const program = useProgram(id);
  const active = useActiveProgram();
  const history = useProgramHistory();
  const select = useSelectProgram();
  const resume = useResumeProgram();
  const styles = useThemedStyles(createStyles);
  // Your own active instance can be reworked from here; without saved
  // answers (a catalogue copy) the prompt explains and offers the interview.
  const isOwnActive = active.data?.programId === id;
  const brief = useProgramBrief(isOwnActive ? id : null);

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
  // One of your own past instances resumes in place (the days you logged
  // stay attached); only a template is copied by selecting it. Until the
  // history has loaded we can't tell which this is, so the button waits.
  const past = history.programs.find((p) => p.id === data.id) ?? null;
  const pending = select.isPending || resume.isPending;
  const title = isActive
    ? '✓ Your program'
    : past != null
      ? past.sessionCount > 0
        ? `Pick up at week ${past.resumeWeek}`
        : 'Start this program'
      : 'Make this my program';
  const failed = select.isError || resume.isError;

  function makeMine() {
    // Chosen: back to the programme tab, where it now is. This screen
    // sits in the root stack, so dismissing to the root lands on the tabs.
    const done = { onSuccess: () => router.dismissTo('/') };
    if (past != null) resume.mutate({ programId: past.id, weekPosition: past.resumeWeek }, done);
    else select.mutate({ programId: data.id }, done);
  }

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
          title={title}
          disabled={isActive}
          loading={pending || (!isActive && history.isPending)}
          onPress={makeMine}
        />
        {failed && <Text style={styles.error}>Couldn&apos;t switch to this program — try again.</Text>}
        {isOwnActive && (
          <NativeButton
            label="Change something"
            variant="secondary"
            systemImage="wand.and.stars"
            onPress={() => promptReworkOrBuild(id, brief.data)}
          />
        )}

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
