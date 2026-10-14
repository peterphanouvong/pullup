import { ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ScreenTitle } from '@/components/ui/screen-title';
import { SectionLabel } from '@/components/ui/section-label';
import { QueryFallback } from '@/features/programs/components/query-fallback';
import { useActiveProgram, usePrograms } from '@/features/programs/hooks';
import type { ProgramSummary } from '@/features/programs/types';

export default function PlanScreen() {
  const programs = usePrograms();
  const active = useActiveProgram();
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

  const activeId = active.data?.programId ?? null;
  const activeProgram = programs.data.filter((p) => p.id === activeId);
  const rest = programs.data.filter((p) => p.id !== activeId);

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
        <ScreenTitle title="Plan" />

        {activeProgram.length > 0 && (
          <>
            <SectionLabel>Your programme</SectionLabel>
            {activeProgram.map((program) => renderCard(program, true))}
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
