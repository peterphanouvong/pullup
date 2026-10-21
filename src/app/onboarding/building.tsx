import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSession } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { StepFrame } from '@/features/onboarding/components/step-frame';
import { useBuildProgram } from '@/features/onboarding/hooks';
import { completeBrief } from '@/features/onboarding/questions';
import { draft$, proposal$ } from '@/features/onboarding/state';

/** No back while the coach is writing: leaving mid-build would strand a
 * half-applied programme. The error state restores it. */
const WRITING_OPTIONS = { headerBackVisible: false, gestureEnabled: false } as const;
const DONE_OPTIONS = { headerBackVisible: true, gestureEnabled: true } as const;

const STAGES = ['Reading your answers', 'Choosing a structure', 'Writing the weeks'];
/** How long each early stage shows before ticking on to the next; the
 * last one waits for the coach. */
const STAGE_MS = 2500;

/**
 * The wait. The coach takes a while to write a block, so the screen shows
 * the work as stages, Cal AI style, rather than a bare spinner. The first
 * two tick on a timer; the last ticks when the plan lands.
 *
 * Arrives with `note` when the reveal's "change something" sends us back
 * round: the same brief, plus what to change, against the instance already
 * written.
 */
export default function BuildingScreen() {
  const { note } = useLocalSearchParams<{ note?: string }>();
  const session = useSession();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const build = useBuildProgram();
  const [stage, setStage] = useState(0);

  const brief = completeBrief(draft$.peek());
  const isGuest = session.user.is_anonymous ?? false;

  useEffect(() => {
    if (brief == null) return;
    const existing = proposal$.peek();
    build.mutate(
      { brief, note: note?.trim() || null, programId: existing?.programId ?? null },
      {
        onSuccess: () => {
          haptics.success();
          router.replace(isGuest ? '/onboarding/save' : '/onboarding/reveal');
        },
        onError: () => haptics.warning(),
      },
    );
    // Build once on arrival; a retry is explicit (the button below).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!build.isPending) return;
    const handle = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), STAGE_MS);
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
        cta="Try again"
        onCta={() => {
          setStage(0);
          build.mutate({ brief, note: note?.trim() || null, programId: proposal$.peek()?.programId ?? null }, {
            onSuccess: () => {
              haptics.success();
              router.replace(isGuest ? '/onboarding/save' : '/onboarding/reveal');
            },
          });
        }}
      >
        <Stack.Screen options={DONE_OPTIONS} />
        <Text style={styles.body}>{build.error.message}</Text>
      </StepFrame>
    );
  }

  return (
    <StepFrame
      step={null}
      title={note ? 'Reworking your program' : 'Writing your program'}
      subtitle="Usually under a minute. Hang on."
      cta="Writing…"
      onCta={() => {}}
      ctaDisabled
    >
      <Stack.Screen options={WRITING_OPTIONS} />
      <View style={styles.stages}>
        {STAGES.map((label, i) => {
          const done = i < stage;
          const current = i === stage;
          return (
            <View key={label} style={styles.stage}>
              {done ? (
                <SymbolView name="checkmark.circle.fill" size={22} tintColor={theme.colors.accent} />
              ) : current ? (
                <ActivityIndicator color={theme.colors.ink} />
              ) : (
                <SymbolView name="circle" size={22} tintColor={theme.colors.inkMuted} />
              )}
              <Text style={[styles.stageText, !done && !current && styles.stageMuted]}>{label}</Text>
            </View>
          );
        })}
      </View>
    </StepFrame>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  body: { ...theme.type.body, color: theme.colors.ink },
  stages: { gap: theme.spacing.lg },
  stage: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: 24 },
  stageText: { ...theme.type.heading, color: theme.colors.ink },
  stageMuted: { color: theme.colors.inkMuted },
});
