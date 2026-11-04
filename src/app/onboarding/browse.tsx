import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { OptionCard } from '@/features/onboarding/components/option-card';
import { StepFrame } from '@/features/onboarding/components/step-frame';
import { QueryFallback } from '@/features/programs/components/query-fallback';
import { usePrograms, useSelectProgram } from '@/features/programs/hooks';

/**
 * The catalogue, inside the interview: pick a template and it becomes
 * your programme, then the flow carries on to the crew step (by way of
 * sign-in for a guest) the same as a coach-written one would. Choosing
 * this way used to drop you out to the Plan screen and skip the rest.
 */
export default function BrowseScreen() {
  const session = useSession();
  const styles = useThemedStyles(createStyles);
  const programs = usePrograms();
  const select = useSelectProgram();
  const [chosen, setChosen] = useState<string | null>(null);
  const isGuest = session.user.is_anonymous ?? false;

  if (programs.isPending || programs.isError) {
    return (
      <QueryFallback isError={programs.isError} message="Couldn't load programs." onRetry={() => programs.refetch()} />
    );
  }

  function use() {
    if (chosen == null) return;
    haptics.tap();
    select.mutate(
      { programId: chosen },
      {
        onSuccess: () => {
          haptics.success();
          router.push(isGuest ? { pathname: '/onboarding/save', params: { next: 'crew' } } : '/onboarding/crew');
        },
        onError: () => haptics.warning(),
      },
    );
  }

  return (
    <StepFrame
      step={null}
      title="Pick a program"
      subtitle="Each one is a full block. You can swap later from Plan, or have the coach write one for you instead."
      cta={select.isPending ? 'Setting up…' : 'Use this program'}
      onCta={use}
      ctaDisabled={chosen == null || select.isPending}
      secondary="Build one with the coach instead"
      onSecondary={() => {
        haptics.tap();
        router.push('/onboarding/1');
      }}
    >
      <View style={styles.options}>
        {programs.data.map((program) => (
          <OptionCard
            key={program.id}
            label={program.name}
            caption={program.summary}
            selected={chosen === program.id}
            onPress={() => setChosen(program.id)}
          />
        ))}
      </View>
      {select.isError && <Text style={styles.error}>Couldn’t set that up. Try again.</Text>}
    </StepFrame>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  options: { gap: theme.spacing.sm },
  error: { ...theme.type.caption, color: theme.colors.danger, textAlign: 'center' },
});
