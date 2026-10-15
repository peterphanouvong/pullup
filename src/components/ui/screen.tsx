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
  topInset = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Pass false on screens with a native (transparent) header — the
   * ScrollView's automatic content-inset adjustment owns the top spacing
   * there, and the safe-area padding would double it. */
  topInset?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.container, topInset && { paddingTop: insets.top }, style]}>{children}</View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
});
