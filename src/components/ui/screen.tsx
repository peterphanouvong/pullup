import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

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
  const styles = useThemedStyles(createStyles);
  return <View style={[styles.container, { paddingTop: insets.top }, style]}>{children}</View>;
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
});
