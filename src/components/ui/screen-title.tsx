import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

/** Display-type screen title row with an optional trailing actions slot
 * (typically one or two `IconCircle`s). */
export function ScreenTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {children != null && <View style={styles.actions}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...theme.type.display, color: theme.colors.ink },
  actions: { flexDirection: 'row', gap: theme.spacing.sm },
}));
