import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Host, ProgressView } from '@expo/ui/swift-ui';
import { tint } from '@expo/ui/swift-ui/modifiers';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeButton } from '@/components/ui/native-button';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

/** Room the pinned footer takes; the scroll content keeps clear of it. */
const FOOTER_CLEARANCE = 120;

/**
 * One onboarding screen under the app's native bar: the system back
 * chevron up top, a thin system progress bar, a heading and a line on why
 * we're asking, the body, and the continue button pinned to the bottom.
 * The frame carries the chrome so every step reads the same and only the
 * question changes.
 *
 * No wrapper view: the bar is transparent, and UIKit only draws its
 * scroll-edge effect when the ScrollView is the screen's first subview,
 * which is also what gives the content its top inset under the bar.
 */
export function StepFrame({
  progress,
  title,
  subtitle,
  children,
  cta,
  onCta,
  ctaDisabled = false,
  secondary,
  onSecondary,
}: {
  /** 0–1; null hides the bar (welcome, building, reveal). */
  progress: number | null;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  cta: string;
  onCta: () => void;
  ctaDisabled?: boolean;
  /** A quieter second action under the primary one ("Not now", "Skip"). */
  secondary?: string;
  onSecondary?: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: FOOTER_CLEARANCE + insets.bottom }]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {progress != null && (
          <Host style={styles.progress}>
            <ProgressView value={Math.min(1, Math.max(0, progress))} modifiers={[tint(theme.colors.ink)]} />
          </Host>
        )}
        <View style={styles.heading}>
          <Text style={styles.title}>{title}</Text>
          {subtitle != null && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {children}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + theme.spacing.md }]} pointerEvents="box-none">
        <NativeButton label={cta} variant="primary" onPress={onCta} disabled={ctaDisabled} />
        {secondary != null && onSecondary != null && (
          <NativeButton label={secondary} variant="ghost" labelColor={theme.colors.inkMuted} onPress={onSecondary} />
        )}
      </View>
    </>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm, gap: theme.spacing.xl },
  progress: { height: 8 },
  heading: { gap: theme.spacing.sm },
  title: { ...theme.type.display, color: theme.colors.ink },
  subtitle: { ...theme.type.body, color: theme.colors.inkMuted },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
});
