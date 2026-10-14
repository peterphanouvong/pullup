import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

// Derived from Tabs' own `tabBar` prop rather than reaching into
// expo-router's internal react-navigation re-export path.
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICON_BY_ROUTE: Record<string, SFSymbol> = {
  index: 'calendar',
  plan: 'list.bullet.rectangle',
  activities: 'clock.arrow.circlepath',
};

/** Floating rounded-pill tab bar: card bg + shadow.float, SF Symbol + 11pt
 * label per tab, accent active tint, inkMuted inactive. */
export function PillTabBar({ state, descriptors, navigation }: TabBarProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + theme.spacing.md }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = typeof options.title === 'string' ? options.title : route.name;
          const isFocused = state.index === index;
          const iconName = ICON_BY_ROUTE[route.name] ?? 'circle';
          const tint = isFocused ? theme.colors.accent : theme.colors.inkMuted;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tab}>
              <SymbolView name={iconName} size={22} tintColor={tint} fallback={<Text style={{ color: tint }}>•</Text>} />
              <Text style={[styles.label, { color: tint }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.pill,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.lg,
    ...theme.shadow.float,
  },
  tab: { alignItems: 'center', gap: 2, minWidth: 56 },
  label: { fontSize: 11, fontWeight: '600' },
});
