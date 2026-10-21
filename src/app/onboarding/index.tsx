import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { StepFrame } from '@/features/onboarding/components/step-frame';
import { useMarkOnboarded } from '@/features/onboarding/gate';
import { resetOnboarding } from '@/features/onboarding/state';

/**
 * First launch. One promise and one button: answer a few questions and
 * get a programme written for you. Browsing the catalogue instead is the
 * quiet alternative, and counts as done so this screen doesn't come back.
 */
export default function WelcomeScreen() {
  const session = useSession();
  const styles = useThemedStyles(createStyles);
  const markOnboarded = useMarkOnboarded(session.user.id);

  function start() {
    haptics.tap();
    resetOnboarding();
    router.push('/onboarding/1');
  }

  async function browse() {
    haptics.tap();
    await markOnboarded();
    router.dismissAll();
    router.push('/plan');
  }

  return (
    <StepFrame
      step={null}
      title="A programme written for you"
      subtitle="Ten quick questions about your goal, your week and your gym. Then a block you can actually keep."
      cta="Build my programme"
      onCta={start}
      secondary="Browse programmes instead"
      onSecondary={() => void browse()}
    >
      <View style={styles.points}>
        <Point text="Lifts around your court nights" />
        <Point text="Fits the days and minutes you have" />
        <Point text="Change it any time, by hand or by asking" />
      </View>
    </StepFrame>
  );
}

function Point({ text }: { text: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.point}>
      <View style={styles.dot} />
      <Text style={styles.pointText}>{text}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  points: { gap: theme.spacing.md },
  point: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.accent },
  pointText: { ...theme.type.body, color: theme.colors.ink },
});
