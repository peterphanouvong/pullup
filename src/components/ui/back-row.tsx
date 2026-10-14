import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { IconCircle } from './icon-circle';

/** Compact custom header for pushed screens (default nav headers are hidden
 * app-wide): circular back button + screen title. */
export function BackRow({ title }: { title: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <IconCircle name="chevron.left" onPress={() => router.back()} />
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  title: { ...theme.type.title, color: theme.colors.ink, flex: 1 },
});
