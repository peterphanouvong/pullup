import { StyleSheet, Text, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

/**
 * Someone's face in the app: their sticker when they've made one (a PNG
 * with its own die-cut border and transparent background, so it's drawn
 * as-is), otherwise their initial in a circle.
 */
export function Avatar({
  uri,
  name,
  size,
  style,
}: {
  uri: string | null | undefined;
  name: string | null | undefined;
  size: number;
  /** Layout only (margins, transforms): applies to either rendering. */
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useThemedStyles(createStyles);
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[{ width: size, height: size }, style as StyleProp<ImageStyle>]}
        contentFit="contain"
        transition={150}
        accessibilityLabel={name ? `${name}'s sticker` : 'Sticker'}
      />
    );
  }
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{(name ?? '?').charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  circle: { backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' },
  initial: { fontWeight: '700', color: theme.colors.onAccent },
});
