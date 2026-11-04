import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { haptics } from '@/lib/haptics';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { Card } from '@/components/ui/card';
import { NativeButton } from '@/components/ui/native-button';
import { SectionLabel } from '@/components/ui/section-label';
import { QueryFallback } from '@/features/programs/components/query-fallback';
import {
  useActiveProgram,
  useProgram,
  useProgramBrief,
  useProgramHistory,
  usePrograms,
  useResumeProgram,
  type PastProgramWithLog,
} from '@/features/programs/hooks';
import type { ProgramSummary } from '@/features/programs/types';
import { briefToDraft } from '@/features/onboarding/questions';
import { seedOnboarding } from '@/features/onboarding/state';
import { ShaderScrollView } from '@/features/backdrop/shader-scroll-view';

/** "3 Nov" / "3 Nov 2025": when you last trained on an old programme. */
function shortDate(iso: string, now: Date): string {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

/**
 * Plan: build a new programme, the one you're on, the ones you've been on
 * before (each a tap from picking back up), and the catalogue.
 */
export default function PlanScreen() {
  const programs = usePrograms();
  const active = useActiveProgram();
  // The active programme is the user's own instance, which the catalogue
  // query (templates only) doesn't include; it's fetched on its own.
  const activeProgram = useProgram(active.data?.programId ?? '');
  const brief = useProgramBrief(active.data?.programId ?? null);
  const history = useProgramHistory();
  const resume = useResumeProgram();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const now = new Date();

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

  /** The interview again, starting from the answers this programme was
   * written from. The build at the end is a new instance; this one goes
   * into the history below rather than being overwritten. */
  function editAnswers() {
    haptics.tap();
    seedOnboarding(briefToDraft(brief.data));
    router.push('/onboarding/1');
  }

  function pickUp(program: PastProgramWithLog) {
    haptics.tap();
    const where = program.sessionCount > 0 ? `week ${program.resumeWeek} of ${program.weekCount}` : 'week 1';
    Alert.alert(
      `Back onto ${program.name}?`,
      `It becomes your program again, with this week as ${where}. ${activeProgram.data != null ? `${activeProgram.data.name} stays here to come back to.` : ''}`.trim(),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pick up',
          onPress: () =>
            resume.mutate(
              { programId: program.id, weekPosition: program.resumeWeek },
              {
                onSuccess: () => {
                  haptics.success();
                  router.dismissAll();
                },
                onError: (e) => Alert.alert('Couldn’t switch back', e.message),
              },
            ),
        },
      ],
    );
  }

  // No wrapper view: the bar is transparent, and UIKit only finds the
  // ScrollView to draw its scroll-edge effect over when that view is the
  // screen's first subview.
  return (
    <ShaderScrollView
      vibe="programme"
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
          <Text style={styles.summary}>A few questions, then a block written for your week.</Text>
        </View>
        <SymbolView name="chevron.right" size={15} tintColor={theme.colors.inkMuted} />
      </Card>

      {activeProgram.data != null && (
        <>
          <SectionLabel>Your program</SectionLabel>
          {renderCard(activeProgram.data, true)}
          {/* Only a built programme has answers to go back to; a
              template copy was never interviewed for. */}
          {brief.data != null && (
            <NativeButton
              variant="secondary"
              systemImage="slider.horizontal.3"
              label="Change my answers and rebuild"
              onPress={editAnswers}
            />
          )}
        </>
      )}

      {history.programs.length > 0 && (
        <>
          <SectionLabel>Programs you’ve been on</SectionLabel>
          {history.programs.map((program) => (
            <Card key={program.id} style={styles.card} onPress={() => router.push(`/program/${program.id}`)}>
              <Text style={styles.name}>{program.name}</Text>
              <Text style={styles.summary}>
                {program.sessionCount > 0
                  ? `${program.sessionCount} ${program.sessionCount === 1 ? 'session' : 'sessions'} · last on ${shortDate(program.lastSessionAt!, now)} · got to week ${program.resumeWeek} of ${program.weekCount}`
                  : `${program.weekCount} weeks · never started · from ${shortDate(program.createdAt, now)}`}
              </Text>
              <NativeButton
                variant="ghost"
                size="small"
                fullWidth={false}
                systemImage="arrow.uturn.backward"
                label={program.sessionCount > 0 ? `Pick up at week ${program.resumeWeek}` : 'Start it'}
                labelColor={theme.colors.accent}
                disabled={resume.isPending}
                onPress={() => pickUp(program)}
              />
            </Card>
          ))}
        </>
      )}

      {rest.length > 0 && (
        <>
          <SectionLabel>Programs</SectionLabel>
          {rest.map((program) => renderCard(program, false))}
        </>
      )}
    </ShaderScrollView>
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
