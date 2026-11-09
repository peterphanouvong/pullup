import { StyleSheet, Text, View } from 'react-native';
import { NativeButton } from '@/components/ui/native-button';
import { useSession } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { useCrewPrompts } from '@/features/crews/use-crew-prompts';
import { StepFrame } from '@/features/onboarding/components/step-frame';
import { useMarkOnboarded } from '@/features/onboarding/gate';
import { leaveOnboarding } from '@/features/onboarding/leave';
import { draft$, resetOnboarding } from '@/features/onboarding/state';
import { Avatar } from '@/features/sticker/components/avatar';
import { useMyAvatar } from '@/features/sticker/hooks';

/**
 * Last step: bring your mates. A crew is the app's only social layer
 * (small, invite-only, no messages), so this is create-or-join and
 * nothing else. A guest who skipped sign-in can't hold a crew yet; they
 * get the pitch and the way back to it.
 */
export default function CrewStepScreen() {
  const session = useSession();
  const styles = useThemedStyles(createStyles);
  const prompts = useCrewPrompts();
  const markOnboarded = useMarkOnboarded(session.user.id);
  const isGuest = session.user.is_anonymous ?? false;
  const avatarUri = useMyAvatar();
  const name = draft$.name.get() ?? null;

  async function finish() {
    haptics.success();
    await markOnboarded();
    leaveOnboarding();
    resetOnboarding();
  }

  return (
    <StepFrame
      step={null}
      title="Train with your mates"
      subtitle={
        isGuest
          ? 'Crews show who’s trained this week, nothing more. Sign in from the Crew tab when you want one.'
          : 'A crew is up to 8 mates who can see who’s trained each day. No workouts, no weights, just whether you showed up. Your sticker goes next to your name.'
      }
      cta={isGuest ? 'Start training' : 'Done'}
      onCta={() => void finish()}
      ctaDisabled={prompts.busy}
    >
      {/* You, as your crew will see you: the sticker from two steps ago. */}
      <View style={styles.you}>
        <Avatar uri={avatarUri} name={name} size={132} />
        {name != null && <Text style={styles.youName}>{name}</Text>}
      </View>
      {!isGuest && (
        <View style={styles.actions}>
          <NativeButton label="Create a crew" variant="secondary" systemImage="plus" onPress={() => prompts.promptCreate(() => void finish())} />
          <NativeButton label="Join with a code" variant="secondary" onPress={() => prompts.promptJoin(() => void finish())} />
          <Text style={styles.hint}>Creating one opens the share sheet with your invite code.</Text>
        </View>
      )}
    </StepFrame>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  you: { alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.md },
  youName: { ...theme.type.heading, color: theme.colors.ink },
  actions: { gap: theme.spacing.sm },
  hint: { ...theme.type.caption, color: theme.colors.inkMuted, textAlign: 'center', paddingTop: theme.spacing.xs },
});
