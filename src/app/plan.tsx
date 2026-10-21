import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { haptics } from '@/lib/haptics';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { Card } from '@/components/ui/card';
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
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  if (programs.isPending || active.isPending || programs.isError || active.isError) {
    return (
      <QueryFallback
        isError={programs.isError || active.isError}
        message="Couldn't load programs."
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

  // No wrapper view: the bar is transparent, and UIKit only finds the
  // ScrollView to draw its scroll-edge effect over when that view is the
  // screen's first subview.
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* The interview, re-runnable: a new block written for where you are
          now. It replaces the active programme, the same as picking a
          template does. */}
      <Card
        style={styles.build}
        onPress={() => {
          haptics.tap();
          router.push('/onboarding/1');
        }}
      >
        <View style={styles.buildIcon}>
          <SymbolView name="sparkles" size={18} tintColor={theme.colors.onAccent} />
        </View>
        <View style={styles.buildText}>
          <Text style={styles.name}>Build my program</Text>
          <Text style={styles.summary}>Ten questions, then a block written for your week.</Text>
        </View>
        <SymbolView name="chevron.right" size={15} tintColor={theme.colors.inkMuted} />
      </Card>

      {activeProgram.data != null && (
        <>
          <SectionLabel>Your program</SectionLabel>
          {renderCard(activeProgram.data, true)}
        </>
      )}

      {rest.length > 0 && (
        <>
          <SectionLabel>Programs</SectionLabel>
          {rest.map((program) => renderCard(program, false))}
        </>
      )}
    </ScrollView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { padding: theme.spacing.lg, gap: theme.spacing.sm, paddingBottom: theme.spacing.xl },
  card: { gap: theme.spacing.xs },
  build: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.sm },
  buildIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildText: { flex: 1, gap: 2 },
  name: { ...theme.type.heading, color: theme.colors.ink },
  summary: { ...theme.type.caption, color: theme.colors.inkMuted },
});
