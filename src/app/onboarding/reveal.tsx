import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSelector } from '@legendapp/state/react';
import { haptics } from '@/lib/haptics';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { SectionLabel } from '@/components/ui/section-label';
import { StepFrame } from '@/features/onboarding/components/step-frame';
import { WeekGlance } from '@/features/onboarding/components/week-glance';
import { proposal$ } from '@/features/onboarding/state';

/**
 * The programme, revealed: its name, what it's for, and week one laid out
 * as a week. It's already written to the account, so Start just moves on;
 * "Change something" takes a sentence and sends the coach back round.
 */
export default function RevealScreen() {
  const proposal = useSelector(proposal$);
  const styles = useThemedStyles(createStyles);

  if (!proposal) {
    router.replace('/onboarding');
    return null;
  }
  const { plan } = proposal;
  const firstWeek = plan.weeks[0];
  const liftingDays = firstWeek.days.filter((d) => d.kind === 'lifting').length;

  function changeSomething() {
    haptics.tap();
    Alert.prompt(
      'What should change?',
      'One line is plenty: “no Friday sessions”, “swap squats for leg press”, “make it shorter”.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rework',
          onPress: (value?: string) => {
            const note = value?.trim() ?? '';
            if (note.length === 0) return;
            router.replace({ pathname: '/onboarding/building', params: { note } });
          },
        },
      ],
    );
  }

  return (
    <StepFrame
      progress={null}
      title={plan.name}
      subtitle={plan.summary}
      cta="Start training"
      onCta={() => {
        haptics.tap();
        router.push('/onboarding/crew');
      }}
      secondary="Change something"
      onSecondary={changeSomething}
    >
      <View style={styles.facts}>
        <Fact value={String(plan.weeks.length)} label={plan.weeks.length === 1 ? 'week' : 'weeks'} />
        <Fact value={String(liftingDays)} label="lifts a week" />
        <Fact value={firstWeek.phase} label="to start" />
      </View>
      <View style={styles.week}>
        <SectionLabel>{firstWeek.name}</SectionLabel>
        <WeekGlance week={firstWeek} />
      </View>
    </StepFrame>
  );
}

function Fact({ value, label }: { value: string; label: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.fact}>
      <Text style={styles.factValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.factLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  facts: { flexDirection: 'row', gap: theme.spacing.sm },
  fact: {
    flex: 1,
    gap: 2,
    padding: theme.spacing.md,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.glassBorder,
  },
  factValue: { ...theme.type.title, color: theme.colors.ink },
  factLabel: { ...theme.type.caption, color: theme.colors.inkMuted },
  week: { gap: theme.spacing.sm },
});
