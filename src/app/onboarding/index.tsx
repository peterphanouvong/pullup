import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { NativeButton } from '@/components/ui/native-button';
import { haptics } from '@/lib/haptics';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { ShaderScrollView } from '@/features/backdrop/shader-scroll-view';
import { path$, resetOnboarding } from '@/features/onboarding/state';

/**
 * First launch, Suno-style: the grain gradient full bleed, the welcome
 * sat low and large with one line under it, one button, and the way in
 * for someone who already has an account right beneath. Both ways of
 * getting a programme run the name and sticker steps first and split
 * after, so nobody misses a step by choosing a template.
 *
 * The sign-in line matters more than it looks: the app has quietly signed
 * this phone in as a guest by now, so without it a returning lifter would
 * rebuild from nothing with their real training one tap away.
 */
export default function WelcomeScreen() {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  function begin(path: 'build' | 'browse') {
    haptics.tap();
    resetOnboarding();
    path$.set(path);
    router.push('/onboarding/name');
  }

  return (
    <ShaderScrollView
      vibe="celebration"
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}
      // The content is sized to the screen, so it mustn't scroll: no
      // automatic bar inset (that adds the bar's height and makes the
      // page scroll by exactly that much), the safe area by hand instead.
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      bounces={false}
      scrollEnabled={false}
    >
      <View style={styles.hero}>
        <Text style={styles.title}>{'Welcome\nto Pull Up'}</Text>
        <Text style={styles.tagline}>A program written for your week, and mates who see you show up.</Text>
      </View>
      <View style={styles.actions}>
        <NativeButton label="Get started" variant="primary" onPress={() => begin('build')} />
        <NativeButton label="Browse programs instead" variant="ghost" onPress={() => begin('browse')} />
        <Pressable
          style={({ pressed }) => [styles.signInRow, pressed && styles.pressed]}
          onPress={() => {
            haptics.tap();
            router.push('/onboarding/sign-in');
          }}
          accessibilityRole="button"
        >
          <Text style={styles.signInLead}>Already have an account? </Text>
          <Text style={styles.signInLink}>Sign in</Text>
        </Pressable>
      </View>
    </ShaderScrollView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.canvas },
  // The hero sits low, Suno's way: the top two thirds are the gradient.
  content: { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: theme.spacing.lg, gap: theme.spacing.xl },
  hero: { gap: theme.spacing.md },
  title: { fontSize: 48, lineHeight: 52, fontWeight: '800', letterSpacing: -1.2, color: theme.colors.ink },
  tagline: { ...theme.type.body, color: theme.colors.inkMuted, maxWidth: 300 },
  actions: { gap: theme.spacing.xs },
  signInRow: { flexDirection: 'row', justifyContent: 'center', paddingVertical: theme.spacing.sm },
  pressed: { opacity: 0.6 },
  signInLead: { ...theme.type.body, color: theme.colors.inkMuted },
  signInLink: { ...theme.type.body, fontWeight: '600', color: theme.colors.ink },
});
