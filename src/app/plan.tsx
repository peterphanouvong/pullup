import { ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { BackRow } from '@/components/ui/back-row';
import { SectionLabel } from '@/components/ui/section-label';
import { QueryFallback } from '@/features/programs/components/query-fallback';
import { useActiveProgram, useProgram, usePrograms } from '@/features/programs/hooks';
import type { ProgramSummary } from '@/features/programs/types';

export default function PlanScreen() {
  const programs = usePrograms();
  const active = useActiveProgram();
  // The active programme is the user's own instance, which the catalogue
  // query (templates only) doesn't include; it's fetched on its own.
  const activeProgram = useProgram(active.data?.programId ?? '');
  const styles = useThemedStyles(createStyles);

  if (programs.isPending || active.isPending || programs.isError || active.isError) {
    return (
      <QueryFallback
        isError={programs.isError || active.isError}
        message="Couldn't load programmes."
        onRetry={() => {
          programs.refetch();
          active.refetch();
        }}
      />
    );
  }

  const templateId = active.data?.templateId ?? null;
  const rest = programs.data.filter((p) => p.id !== templateId);

  const renderCard = (program: ProgramSummary, isActive: boolean) => (
    <Card key={program.id} style={styles.card} onPress={() => router.push(`/program/${program.id}`)}>
      <Text style={styles.name}>{isActive ? `✓ ${program.name}` : program.name}</Text>
      <Text style={styles.summary}>{program.summary}</Text>
    </Card>
  );

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <BackRow title="Plan" />

        {activeProgram.data != null && (
          <>
            <SectionLabel>Your programme</SectionLabel>
            {renderCard(activeProgram.data, true)}
          </>
        )}

        {rest.length > 0 && (
          <>
            <SectionLabel>Programmes</SectionLabel>
            {rest.map((program) => renderCard(program, false))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  content: { padding: theme.spacing.lg, gap: theme.spacing.sm, paddingBottom: theme.spacing.xl },
  card: { gap: theme.spacing.xs },
  name: { ...theme.type.heading, color: theme.colors.ink },
  summary: { ...theme.type.caption, color: theme.colors.inkMuted },
});
