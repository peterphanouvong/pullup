import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

/** Standard iOS swipe-left-to-reveal-Delete wrapper for list rows.
 * The revealed action only invokes `onDelete` — confirmation (if any) is the
 * caller's responsibility. Requires `GestureHandlerRootView` at the app root. */
export function SwipeToDelete({
  onDelete,
  leadingAction,
  childStyle,
  children,
}: {
  onDelete: () => void;
  /** Optional swipe-right action revealed on the leading edge. */
  leadingAction?: { label: string; icon: SFSymbol; onPress: () => void };
  /** Opaque background for the swiped content (defaults to canvas) so the
   * revealed action doesn't show through transparent rows. */
  childStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      childrenContainerStyle={childStyle ?? styles.children}
      renderLeftActions={
        leadingAction != null
          ? () => (
              <Pressable style={styles.leadingAction} onPress={leadingAction.onPress}>
                <SymbolView name={leadingAction.icon} size={18} tintColor={theme.colors.onAccent} />
                <Text style={styles.actionLabel}>{leadingAction.label}</Text>
              </Pressable>
            )
          : undefined
      }
      renderRightActions={() => (
        <Pressable style={styles.action} onPress={onDelete}>
          <SymbolView
            name="trash.fill"
            size={18}
            tintColor={theme.colors.onAccent}
            fallback={<Text style={styles.actionLabel}>🗑</Text>}
          />
          <Text style={styles.actionLabel}>Delete</Text>
        </Pressable>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  children: { backgroundColor: theme.colors.canvas },
  leadingAction: {
    width: 88,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  action: {
    width: 88,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  actionLabel: { ...theme.type.caption, color: theme.colors.onAccent, fontWeight: '700' },
  // (leadingAction shares actionLabel's treatment.)
});
