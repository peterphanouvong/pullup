import type { ReactNode } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

/** `label`-type eyebrow, inkMuted — section headers, table headers. */
export function SectionLabel({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const styles = useThemedStyles(createStyles);
  return <Text style={[styles.label, style]}>{children}</Text>;
}

const createStyles = (theme: Theme) => StyleSheet.create({
  label: { ...theme.type.label, color: theme.colors.inkMuted },
});
