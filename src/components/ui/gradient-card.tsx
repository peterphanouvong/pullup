import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

/** Same geometry as `Card`, rendered over a two-stop gradient (e.g.
 * `theme.colors.gradientRecap` / `gradientEmber`) for recap/summary and
 * comp-week banners. Text on top should use `theme.colors.onGradient`. */
export function GradientCard({
  colors,
  children,
}: {
  colors: readonly [string, string, ...string[]];
  children: ReactNode;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      {children}
    </LinearGradient>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  card: {
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    ...theme.shadow.card,
  },
});
