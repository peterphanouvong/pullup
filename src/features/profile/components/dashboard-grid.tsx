import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { GlassSurface } from '@/components/ui/glass-surface';
import { haptics } from '@/lib/haptics';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

export interface DashboardTile {
  icon: SFSymbol;
  label: string;
  onPress: () => void;
}

/** Two-up tiles under the chart, Hevy's "Dashboard": the ways into
 * everything that isn't this week. Each tile is real Liquid Glass over a
 * faint fill (the fallback where glass isn't available). */
export function DashboardGrid({ tiles }: { tiles: DashboardTile[] }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <Pressable
          key={tile.label}
          onPress={() => {
            haptics.tap();
            tile.onPress();
          }}
          style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
        >
          <GlassSurface cornerRadius={theme.radii.lg} />
          <SymbolView name={tile.icon} size={18} tintColor={theme.colors.ink} />
          <Text style={styles.label}>{tile.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  tile: {
    // Two per row, less the gap between them.
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.lg,
    // Clips the glass layer to the corners.
    overflow: 'hidden',
    backgroundColor: theme.colors.glassControl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.glassBorder,
  },
  pressed: { opacity: 0.7 },
  label: { ...theme.type.heading, color: theme.colors.ink },
});
