import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

/** Display-type screen title row with an optional trailing actions slot
 * (typically one or two `IconCircle`s). */
export function ScreenTitle({ title, children }: { title: string; children?: ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {children != null && <View style={styles.actions}>{children}</View>}
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...theme.type.display, color: theme.colors.ink },
  actions: { flexDirection: 'row', gap: theme.spacing.sm },
});
