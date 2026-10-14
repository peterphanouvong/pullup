import { Pressable, Text } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

/** A small circular icon button — used in `ScreenTitle`'s trailing slot and
 * anywhere else a quiet, card-colored tap target is needed. */
export function IconCircle({
  name,
  fallback,
  onPress,
  size = 36,
}: {
  name: SFSymbol;
  fallback?: string;
  onPress?: () => void;
  size?: number;
}) {
  const { theme } = useUnistyles();
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
        tintColor={theme.colors.ink}
        fallback={<Text style={{ color: theme.colors.ink }}>{fallback ?? '•'}</Text>}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  circle: {
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.card,
  },
  pressed: { opacity: 0.7 },
}));
