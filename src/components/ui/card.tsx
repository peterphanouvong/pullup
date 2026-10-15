import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassSurface } from '@/components/ui/glass-surface';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

/** The app's card surface: real Liquid Glass over a translucent fill, with a
 * hairline edge, radius xl and padding lg. Becomes a `Pressable` when
 * `onPress` is given, otherwise a plain `View`.
 *
 * Pass `glass={false}` for cards that sit on top of other cards or inside
 * dense lists, where a second hosted glass layer costs more than it adds. */
export function Card({
  children,
  style,
  onPress,
  glass = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  glass?: boolean;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const content = (
    <>
      {glass && <GlassSurface cornerRadius={theme.radii.xl} />}
      {children}
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}>
        {content}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{content}</View>;
}

const createStyles = (theme: Theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.glass,
    borderRadius: theme.radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.glassBorder,
    padding: theme.spacing.lg,
    // Clips the glass layer to the rounded corners.
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  pressed: { opacity: 0.85 },
});
