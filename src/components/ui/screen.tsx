import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

/** Canvas-bg wrapper with top-safe-area padding. Screens own their own
 * horizontal/bottom padding (via a ScrollView contentContainerStyle) so this
 * stays a single, reusable shell for both scrollable and static screens. */
export function Screen({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.container, { paddingTop: insets.top }, style]}>{children}</View>;
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
}));
