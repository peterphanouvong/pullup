import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSession } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { capture } from '@/lib/analytics';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { StepFrame } from '@/features/onboarding/components/step-frame';
import type { BuildProgress } from '@/features/onboarding/api';
import { useBuildProgram } from '@/features/onboarding/hooks';
import { completeBrief } from '@/features/onboarding/questions';
import { leaveOnboarding } from '@/features/onboarding/leave';
import { draft$, proposal$ } from '@/features/onboarding/state';

/** No back while the coach is writing: leaving mid-build would strand a
 * half-applied programme. The error state restores it. */
const WRITING_OPTIONS = { headerBackVisible: false, gestureEnabled: false } as const;
const DONE_OPTIONS = { headerBackVisible: true, gestureEnabled: true } as const;

/** After this long the subtitle owns up to it. */
const SLOW_AFTER_S = 75;

/** What the screen knows about the write so far. `weeks` fills as each
 * week's phase lands; `name` once the programme is titled. */
interface Live {
  stage: 'reading' | 'structure' | 'weeks';
  name: string | null;
  weeks: { name: string; phase: string }[];
}

const FRESH: Live = { stage: 'reading', name: null, weeks: [] };

function advance(live: Live, p: BuildProgress): Live {
  switch (p.stage) {
    case 'reading':
      return live;
    case 'structure':
      return { ...live, stage: live.weeks.length > 0 ? 'weeks' : 'structure', name: p.name };
    case 'week':
      return { ...live, stage: 'weeks', weeks: [...live.weeks.slice(0, p.week - 1), { name: p.name, phase: p.phase }] };
  }
}

/** "1:07" */
function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * The wait. The coach takes a while to write a block, so the screen shows
 * the work as it happens: the answers being read, the programme getting
 * its name, then each week ticking off as the coach finishes it, with a
 * clock running underneath. Everything comes from the function's progress
 * stream (see features/onboarding/api), so what's shown is what's written.
 *
 * Arrives with `note` when "change something" sends us round: the same
 * brief, plus what to change, against the instance already written. From
 * the reveal that instance is the proposal's; from the Program tab or a
 * programme's page it comes as `programId`, with `from=program` so the
 * result goes back there instead of on to the reveal.
 */
export default function BuildingScreen() {
  const { note, programId, from } = useLocalSearchParams<{ note?: string; programId?: string; from?: string }>();
  const fromProgram = from === 'program';
  const session = useSession();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const build = useBuildProgram();
  const [live, setLive] = useState<Live>(FRESH);
  const [elapsed, setElapsed] = useState(0);

  const brief = completeBrief(draft$.peek());
  const isGuest = session.user.is_anonymous ?? false;

  function run() {
    build.mutate(
      {
        brief: brief!,
        note: note?.trim() || null,
        programId: programId ?? proposal$.peek()?.programId ?? null,
        onProgress: (p) => setLive((l) => advance(l, p)),
      },
      {
        onSuccess: () => {
          capture('programme_generated', { is_rework: note != null, from_programme: fromProgram });
          haptics.success();
          if (fromProgram) leaveOnboarding();
          else router.replace(isGuest ? '/onboarding/save' : '/onboarding/reveal');
        },
        onError: () => haptics.warning(),
      },
    );
  }

  // Try again: a clean slate, then the same call.
  function retry() {
    setLive(FRESH);
    setElapsed(0);
    run();
  }

  useEffect(() => {
    if (brief == null) return;
    run();
    // Build once on arrival; a retry is explicit (the button below).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!build.isPending) return;
    const handle = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(handle);
  }, [build.isPending]);

  if (brief == null) {
    // Landed here without a finished interview (a deep link, a reload).
    return (
      <StepFrame step={null} title="Let’s start again" cta="Start" onCta={() => router.replace('/onboarding')}>
        <Text style={styles.body}>Your answers didn’t make it. A few questions and we’re back here.</Text>
      </StepFrame>
    );
  }

  if (build.isError) {
    return (
      <StepFrame
        step={null}
        title="That didn’t work"
        subtitle="Your answers are kept. Trying again sends the same brief."
        cta="Try again"
        onCta={retry}
      >
        <Stack.Screen options={DONE_OPTIONS} />
        <Text style={styles.body}>{build.error.message}</Text>
      </StepFrame>
    );
  }

  const stages: { label: string; state: 'done' | 'current' | 'todo'; detail?: string }[] = [
    {
      label: 'Reading your answers',
      state: live.stage === 'reading' ? 'current' : 'done',
    },
    {
      label: live.name != null ? `Choosing a structure: ${live.name}` : 'Choosing a structure',
      state: live.stage === 'reading' ? 'todo' : live.stage === 'structure' ? 'current' : 'done',
    },
    {
      label: 'Writing the weeks',
      state: live.stage === 'weeks' ? 'current' : 'todo',
    },
  ];

  return (
    <StepFrame
      step={null}
      title={note ? 'Reworking your program' : 'Writing your program'}
      subtitle={elapsed >= SLOW_AFTER_S ? 'Taking a little longer than usual. Still writing, hang on.' : 'Usually under a minute. Hang on.'}
      cta="Writing…"
      onCta={() => {}}
      ctaDisabled
    >
      <Stack.Screen options={WRITING_OPTIONS} />
      <Text style={styles.clock}>{clock(elapsed)}</Text>
      <View style={styles.stages}>
        {stages.map((stage) => (
          <View key={stage.label.split(':')[0]} style={styles.stage}>
            <View style={styles.stageRow}>
              {stage.state === 'done' ? (
                <SymbolView name="checkmark.circle.fill" size={22} tintColor={theme.colors.accent} />
              ) : stage.state === 'current' ? (
                <ActivityIndicator color={theme.colors.ink} />
              ) : (
                <SymbolView name="circle" size={22} tintColor={theme.colors.inkMuted} />
              )}
              <Text style={[styles.stageText, stage.state === 'todo' && styles.stageMuted]} numberOfLines={2}>
                {stage.label}
              </Text>
            </View>
          </View>
        ))}
        {/* The weeks, as they land. */}
        {live.weeks.length > 0 && (
          <View style={styles.weeks}>
            {live.weeks.map((w, i) => (
              <View key={`${i}-${w.name}`} style={styles.week}>
                <SymbolView name="checkmark" size={14} tintColor={theme.colors.accent} />
                <Text style={styles.weekText} numberOfLines={1}>{`${w.name} · ${w.phase}`}</Text>
              </View>
            ))}
            <View style={styles.week}>
              <ActivityIndicator size="small" color={theme.colors.inkMuted} />
              <Text style={[styles.weekText, styles.stageMuted]}>{`Week ${live.weeks.length + 1}…`}</Text>
            </View>
          </View>
        )}
      </View>
    </StepFrame>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  body: { ...theme.type.body, color: theme.colors.ink },
  clock: { ...theme.type.caption, color: theme.colors.inkMuted, fontVariant: ['tabular-nums'] },
  stages: { gap: theme.spacing.lg },
  stage: { gap: theme.spacing.xs },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: 24 },
  stageText: { ...theme.type.heading, color: theme.colors.ink, flex: 1 },
  stageMuted: { color: theme.colors.inkMuted },
  weeks: { gap: theme.spacing.sm, paddingLeft: 22 + theme.spacing.md },
  week: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: 20 },
  weekText: { ...theme.type.body, color: theme.colors.ink },
});
