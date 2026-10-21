import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/ui/primary-button';
import { NativeButton } from '@/components/ui/native-button';
import { haptics } from '@/lib/haptics';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

/**
 * One onboarding screen: a back chevron and a thin progress bar up top,
 * a heading and a line on why we're asking, the body, and the continue
 * button pinned to the bottom. The frame carries the chrome so every step
 * reads the same and only the question changes.
 *
 * The onboarding stack hides the native header: a quiz has one way forward
 * and one way back, and the chevron here is it.
 */
export function StepFrame({
  progress,
  title,
  subtitle,
  children,
  cta,
  onCta,
  ctaDisabled = false,
  ctaLoading = false,
  secondary,
  onSecondary,
  onBack,
}: {
  /** 0–1; null hides the bar (welcome, building, reveal). */
  progress: number | null;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  cta: string;
  onCta: () => void;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  /** A quieter second action under the primary one ("Not now", "Skip"). */
  secondary?: string;
  onSecondary?: () => void;
  /** Absent: no chevron (the first screen, or one you can't back out of). */
  onBack?: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + theme.spacing.sm, paddingBottom: insets.bottom + theme.spacing.md }]}>
      <View style={styles.top}>
        {onBack ? (
          <Pressable
            onPress={() => {
              haptics.tap();
              onBack();
            }}
            hitSlop={12}
            accessibilityLabel="Back"
            style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
          >
            <SymbolView name="chevron.left" size={16} tintColor={theme.colors.ink} />
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
        {progress != null && (
          <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 1, now: progress }}>
            <View style={[styles.fill, { width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }]} />
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heading}>
          <Text style={styles.title}>{title}</Text>
          {subtitle != null && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {children}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title={cta} onPress={onCta} disabled={ctaDisabled} loading={ctaLoading} />
        {secondary != null && onSecondary != null && (
          <NativeButton label={secondary} variant="ghost" labelColor={theme.colors.inkMuted} onPress={onSecondary} />
        )}
      </View>
    </View>
  );
}

const BACK = 36;

const createStyles = (theme: Theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.canvas, paddingHorizontal: theme.spacing.lg },
  top: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, height: BACK },
  back: {
    width: BACK,
    height: BACK,
    borderRadius: BACK / 2,
    backgroundColor: theme.colors.glassControl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPressed: { opacity: 0.7 },
  track: { flex: 1, height: 4, borderRadius: 2, backgroundColor: theme.colors.glassControl, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: theme.colors.ink, borderRadius: 2 },
  scroll: { flex: 1 },
  content: { paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.xl, gap: theme.spacing.xl },
  heading: { gap: theme.spacing.sm },
  title: { ...theme.type.display, color: theme.colors.ink },
  subtitle: { ...theme.type.body, color: theme.colors.inkMuted },
  footer: { gap: theme.spacing.xs, paddingTop: theme.spacing.sm },
});
