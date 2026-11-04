import { useEffect, useState, type ReactNode, type RefObject } from 'react';
import { Dimensions, Keyboard, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeButton } from '@/components/ui/native-button';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

/** Room the pinned footer takes; the scroll content keeps clear of it. */
const FOOTER_CLEARANCE = 120;

/** The keyboard's height while it's up, 0 otherwise. Tracks the frame
 * change rather than show/hide so the footer moves with the keyboard's
 * own animation instead of after it. */
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const change = Keyboard.addListener('keyboardWillChangeFrame', (e) => {
      // How much of the window the keyboard will cover: its top edge up
      // to the bottom of the screen. Zero once it's slid off the bottom.
      setHeight(Math.max(0, Dimensions.get('window').height - e.endCoordinates.screenY));
    });
    const hide = Keyboard.addListener('keyboardWillHide', () => setHeight(0));
    return () => {
      change.remove();
      hide.remove();
    };
  }, []);
  return height;
}

/**
 * One onboarding screen under the app's native bar: the system back
 * chevron up top, a quiet "Step 3 of 10" line, the question, a line on why
 * we're asking, and the answers, with the continue button pinned to the
 * bottom. The frame carries the chrome so every step reads the same and
 * only the question changes.
 *
 * The footer rides up on the keyboard, so Continue is never under it
 * while a name or a written answer is being typed, and the scroll view
 * insets itself for the keyboard so the field being typed into stays in
 * view.
 *
 * No wrapper view: the bar is transparent, and UIKit only draws its
 * scroll-edge effect when the ScrollView is the screen's first subview,
 * which is also what gives the content its top inset under the bar.
 */
export function StepFrame({
  step,
  title,
  subtitle,
  children,
  cta,
  onCta,
  ctaDisabled = false,
  secondary,
  onSecondary,
  tertiary,
  onTertiary,
  scrollRef,
}: {
  /** Which question this is ("Step 3 of 10"); null for screens that
   * aren't a question. */
  step: { index: number; total: number } | null;
  title: string;
  /** Optional: a screen can be just a heading. */
  subtitle?: string;
  children?: ReactNode;
  cta: string;
  onCta: () => void;
  ctaDisabled?: boolean;
  /** A quieter second action under the primary one ("Not now", "Skip"). */
  secondary?: string;
  onSecondary?: () => void;
  /** A third, for the rare screen with a side door ("Sign in instead"). */
  tertiary?: string;
  onTertiary?: () => void;
  /** The frame's scroll view, for a screen that needs to bring something
   * into view (a text box that just opened under the keyboard). */
  scrollRef?: RefObject<ScrollView | null>;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  // Over the keyboard the home indicator's inset is already covered.
  const footerBottom = keyboard > 0 ? keyboard + theme.spacing.sm : insets.bottom + theme.spacing.md;

  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: FOOTER_CLEARANCE + insets.bottom }]}
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heading}>
          {step != null && <Text style={styles.eyebrow}>{`Step ${step.index} of ${step.total}`}</Text>}
          <Text style={styles.title}>{title}</Text>
          {subtitle != null && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {children}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerBottom }]} pointerEvents="box-none">
        <NativeButton label={cta} variant="primary" onPress={onCta} disabled={ctaDisabled} />
        {/* The quieter actions tuck away while typing: the keyboard has
            the room, and Continue is the one that matters then. */}
        {keyboard === 0 && secondary != null && onSecondary != null && (
          <NativeButton label={secondary} variant="ghost" labelColor={theme.colors.inkMuted} onPress={onSecondary} />
        )}
        {keyboard === 0 && tertiary != null && onTertiary != null && (
          <NativeButton label={tertiary} variant="ghost" labelColor={theme.colors.inkMuted} onPress={onTertiary} />
        )}
      </View>
    </>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm, gap: theme.spacing.xl },
  heading: { gap: theme.spacing.sm },
  eyebrow: { ...theme.type.caption, color: theme.colors.inkMuted },
  // Quieter than the app's display type: a question, not a headline.
  title: { fontSize: 28, fontWeight: '600', letterSpacing: -0.3, color: theme.colors.ink },
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
