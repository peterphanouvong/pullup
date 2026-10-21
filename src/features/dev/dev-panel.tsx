import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, type Href } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SectionLabel } from '@/components/ui/section-label';
import { useSession } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { useActiveProgram } from '@/features/programs/hooks';
import { draft$, resetOnboarding } from '@/features/onboarding/state';
import type { TrainingBrief } from '@/features/onboarding/brief';

/** A full set of answers, so the screens after the questions can be
 * opened without tapping through them. */
const SAMPLE_BRIEF: TrainingBrief = {
  goal: 'jump',
  sport: 'volleyball',
  courtDays: 2,
  season: 'in',
  liftDays: 3,
  sessionMinutes: 45,
  minimumMinutes: 15,
  obstacles: ['drop_off'],
  equipment: 'gym',
  experience: 'some',
  limitations: ['knee'],
  sacrifices: ['late_nights'],
  weeks: 4,
  notes: {},
};

/**
 * Development only: a way to every screen without walking the app to it,
 * for trying flows that normally gate themselves (onboarding shows itself
 * once; the reveal needs a built programme). Rendered by Profile under
 * `__DEV__`, so a release build never has it.
 */
export function DevPanel() {
  const session = useSession();
  const queryClient = useQueryClient();
  const active = useActiveProgram();
  const styles = useThemedStyles(createStyles);
  const programId = active.data?.programId ?? null;

  function go(href: Href) {
    haptics.tap();
    router.push(href);
  }

  async function forgetOnboarding() {
    await AsyncStorage.removeItem(`onboarding-done:${session.user.id}`);
    queryClient.setQueryData(['onboarding-done', session.user.id], false);
    resetOnboarding();
    haptics.success();
    Alert.alert('Forgotten', 'The Program tab will push onboarding again next time it has no program to show.');
  }

  function useSampleBrief() {
    resetOnboarding();
    draft$.set({ ...SAMPLE_BRIEF, name: 'Sam' });
    haptics.success();
    Alert.alert('Sample brief loaded', 'Building and the last question now have answers to work from.');
  }

  const links: { label: string; href: Href }[] = [
    { label: 'Onboarding: welcome', href: '/onboarding' },
    { label: 'Onboarding: name', href: '/onboarding/name' },
    { label: 'Onboarding: question 1', href: '/onboarding/1' },
    { label: 'Onboarding: building (needs a brief)', href: '/onboarding/building' },
    { label: 'Onboarding: save (sign in)', href: '/onboarding/save' },
    { label: 'Onboarding: reveal (needs a build)', href: '/onboarding/reveal' },
    { label: 'Onboarding: crew step', href: '/onboarding/crew' },
    { label: 'Plan', href: '/plan' },
    { label: 'Calendar', href: '/calendar' },
    { label: 'Activity', href: '/activities' },
    { label: 'Exercise picker', href: '/workout/picker' },
    ...(programId ? [{ label: 'Active program overview', href: `/program/${programId}` as Href }] : []),
  ];

  return (
    <View style={styles.panel}>
      <SectionLabel>Dev</SectionLabel>
      <Text style={styles.note}>
        {`User ${session.user.id.slice(0, 8)}… · ${session.user.is_anonymous ? 'guest' : 'signed in'} · ${programId ? 'has a program' : 'no program'}`}
      </Text>
      <View style={styles.rows}>
        <Row label="Forget onboarding (replay first launch)" onPress={() => void forgetOnboarding()} />
        <Row label="Load a sample brief" onPress={useSampleBrief} />
        {links.map((link) => (
          <Row key={link.label} label={link.label} onPress={() => go(link.href)} />
        ))}
      </View>
    </View>
  );
}

function Row({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <Text style={styles.rowLabel}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  panel: { gap: theme.spacing.sm, paddingTop: theme.spacing.lg },
  note: { ...theme.type.caption, color: theme.colors.inkMuted },
  rows: {
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  row: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  rowPressed: { opacity: 0.7 },
  rowLabel: { ...theme.type.body, color: theme.colors.accent },
});
