import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSelector } from '@legendapp/state/react';
import { haptics } from '@/lib/haptics';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { SectionLabel } from '@/components/ui/section-label';
import { WeekPills } from '@/components/ui/week-pills';
import { StepFrame } from '@/features/onboarding/components/step-frame';
import { WeekGlance } from '@/features/onboarding/components/week-glance';
import { draft$, proposal$ } from '@/features/onboarding/state';
import { useProgram } from '@/features/programs/hooks';

/**
 * The programme, revealed: its name, what it's for, and the whole block
 * to flick through, a week at a time, with every day one tap from its
 * workout. It's already written to the account, so Start just moves on;
 * "Change something" takes a sentence and sends the coach back round.
 *
 * The weeks come from the instance just written, not the plan as
 * returned: the instance's days have ids, which is what the workout
 * preview opens by.
 */
export default function RevealScreen() {
  // Read once: a rework replaces this screen with a fresh one, and the
  // reset that finishing the interview does happens while this screen is
  // still mounted underneath. Tracking the store live made it re-render
  // with nothing and navigate during render.
  const [proposal] = useState(() => proposal$.peek());
  const name = useSelector(() => draft$.name.get());
  const styles = useThemedStyles(createStyles);
  const program = useProgram(proposal?.programId ?? '');
  const [viewedWeek, setViewedWeek] = useState(1);

  // Landed here with nothing to show (a deep link, a reload): start over.
  // Only while focused, so leaving the interview doesn't trigger it.
  useFocusEffect(
    useCallback(() => {
      if (!proposal) router.replace('/onboarding');
    }, [proposal]),
  );

  if (!proposal) return null;
  const { plan, programId } = proposal;
  const firstWeek = plan.weeks[0];
  const liftingDays = firstWeek.days.filter((d) => d.kind === 'lifting').length;
  const weeks = program.data?.weeks ?? [];
  const week = weeks.find((w) => w.position === viewedWeek) ?? weeks[0] ?? null;

  function changeSomething() {
    haptics.tap();
    Alert.prompt(
      'What should change?',
      'One line is plenty: “no Friday sessions”, “swap squats for leg press”, “make it 8 weeks”.',
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
      step={null}
      title={plan.name}
      subtitle={plan.summary}
      cta={name ? `Let’s go, ${name}` : 'Start training'}
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
        {week == null ? (
          <ActivityIndicator style={styles.loading} />
        ) : (
          <>
            {weeks.length > 1 && (
              <WeekPills weeks={weeks} viewedPosition={week.position} currentPosition={1} onSelect={setViewedWeek} />
            )}
            <SectionLabel>{`${week.name} · ${week.phase}`}</SectionLabel>
            {week.description != null && <Text style={styles.weekNote}>{week.description}</Text>}
            <WeekGlance
              days={week.days}
              onPressDay={(i) => {
                haptics.tap();
                // A look, not a workout: the day page without its start
                // and edit controls.
                router.push({ pathname: '/program/[id]/day/[dayId]', params: { id: programId, dayId: week.days[i].id, preview: '1' } });
              }}
            />
          </>
        )}
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
  weekNote: { ...theme.type.caption, color: theme.colors.inkMuted },
  loading: { paddingVertical: theme.spacing.xl },
});
