import { Pressable, StyleSheet, Text } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

/** A small circular icon button — used in `ScreenTitle`'s trailing slot and
 * anywhere else a quiet, card-colored tap target is needed. */
export function IconCircle({
  name,
  fallback,
  onPress,
  size = 36,
  tint,
}: {
  name: SFSymbol;
  fallback?: string;
  onPress?: () => void;
  size?: number;
  /** Symbol color override (defaults to ink) — e.g. danger for a trash. */
  tint?: string;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const tintColor = tint ?? theme.colors.ink;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && styles.pressed,
      ]}
    >
      <SymbolView
        name={name}
        size={size * 0.5}
        tintColor={tintColor}
        fallback={<Text style={{ color: tintColor }}>{fallback ?? '•'}</Text>}
      />
    </Pressable>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  circle: {
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.card,
  },
  pressed: { opacity: 0.7 },
});
