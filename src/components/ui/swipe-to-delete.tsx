import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

/** Swipe-to-reveal row actions: Delete on the trailing edge always, plus an
 * optional leading action.
 *
 * The actions are inset, rounded chips rather than full-bleed slabs, so they
 * read as part of our card language. (SwiftUI's own `.swipeActions` would be
 * the native option, but it only applies to SwiftUI rows inside a SwiftUI
 * List — these rows are React Native, text inputs included.)
 *
 * Invoking `onDelete` is all the trailing action does; confirmation, if any,
 * belongs to the caller. Requires `GestureHandlerRootView` at the app root. */
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
      leftThreshold={40}
      rightThreshold={40}
      overshootLeft={false}
      overshootRight={false}
      childrenContainerStyle={childStyle ?? styles.children}
      renderLeftActions={
        leadingAction != null
          ? () => (
              <View style={styles.actionSlot}>
                <Pressable
                  style={({ pressed }) => [styles.action, styles.leadingAction, pressed && styles.pressed]}
                  onPress={leadingAction.onPress}
                >
                  <SymbolView name={leadingAction.icon} size={17} tintColor={theme.colors.onAccent} />
                  <Text style={[styles.actionLabel, styles.leadingLabel]}>{leadingAction.label}</Text>
                </Pressable>
              </View>
            )
          : undefined
      }
      renderRightActions={() => (
        <View style={styles.actionSlot}>
          <Pressable
            style={({ pressed }) => [styles.action, styles.deleteAction, pressed && styles.pressed]}
            onPress={onDelete}
          >
            <SymbolView
              name="trash.fill"
              size={17}
              tintColor={theme.colors.onGradient}
              fallback={<Text style={styles.actionLabel}>🗑</Text>}
            />
            <Text style={styles.actionLabel}>Delete</Text>
          </Pressable>
        </View>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  children: { backgroundColor: theme.colors.canvas },
  // The slot fills the row's height; the chip inside is inset from it, which
  // is what gives the action rounded corners instead of a full-bleed edge.
  actionSlot: { justifyContent: 'center', paddingHorizontal: theme.spacing.xs },
  action: {
    width: 76,
    alignSelf: 'stretch',
    marginVertical: theme.spacing.xs,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  leadingAction: { backgroundColor: theme.colors.accent },
  deleteAction: { backgroundColor: theme.colors.danger },
  pressed: { opacity: 0.8 },
  // Delete sits on red, so its label is white; the leading chip sits on our
  // accent (near-white in dark mode) and takes the contrasting ink instead.
  actionLabel: { ...theme.type.caption, color: theme.colors.onGradient, fontWeight: '700' },
  leadingLabel: { color: theme.colors.onAccent },
});
