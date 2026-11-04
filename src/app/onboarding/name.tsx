import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { router } from 'expo-router';
import { haptics } from '@/lib/haptics';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { cleanDisplayName, DISPLAY_NAME_MAX } from '@/features/account/api';
import { useProfile } from '@/features/account/hooks';
import { StepFrame } from '@/features/onboarding/components/step-frame';
import { draft$ } from '@/features/onboarding/state';

/**
 * First question, before the numbered ones: what to call them. It goes in
 * the headings that follow and becomes their crew name once they sign in.
 * First name only, and never sent to the coach.
 */
export default function NameScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const profile = useProfile();
  const [name, setName] = useState(() => draft$.name.peek() ?? profile.data?.displayName ?? '');
  const clean = cleanDisplayName(name);

  function next() {
    haptics.tap();
    draft$.name.set(clean ?? undefined);
    router.push('/onboarding/selfie');
  }

  return (
    <StepFrame
      step={null}
      title="First up, what should we call you?"
      subtitle="Your first name is plenty. It’s what your crew will see."
      cta="Continue"
      onCta={next}
      ctaDisabled={clean == null}
      secondary="Skip"
      onSecondary={() => {
        draft$.name.set(undefined);
        router.push('/onboarding/selfie');
      }}
    >
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="First name"
        placeholderTextColor={theme.colors.inkMuted}
        maxLength={DISPLAY_NAME_MAX}
        autoFocus
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="next"
        onSubmitEditing={() => clean != null && next()}
        accessibilityLabel="First name"
      />
    </StepFrame>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  input: {
    ...theme.type.title,
    fontWeight: '600',
    color: theme.colors.ink,
    minHeight: 64,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.glassBorder,
  },
});
