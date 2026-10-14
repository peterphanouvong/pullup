import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

/** Vertical room the floating button needs above the screen bottom: the
 * translucent native tab bar plus breathing space. Scroll content on screens
 * hosting a FloatingAction should pad its bottom by this plus the button
 * height (~56). */
export const FLOATING_ACTION_CLEARANCE = 72;

/** Runna-style floating primary action, pinned above the glass tab bar. */
export function FloatingAction({
  label,
  icon = 'play.fill',
  onPress,
}: {
  label: string;
  icon?: SFSymbol;
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { bottom: insets.bottom + FLOATING_ACTION_CLEARANCE },
        pressed && styles.pressed,
      ]}
    >
      <SymbolView name={icon} size={16} tintColor={theme.colors.onAccent} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  button: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.pill,
    paddingVertical: theme.spacing.lg,
    ...theme.shadow.float,
  },
  pressed: { opacity: 0.9 },
  label: { ...theme.type.heading, color: theme.colors.onAccent },
});
