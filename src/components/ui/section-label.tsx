import type { ReactNode } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

/** `label`-type eyebrow, inkMuted — section headers, table headers. */
export function SectionLabel({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

const styles = StyleSheet.create((theme) => ({
  label: { ...theme.type.label, color: theme.colors.inkMuted },
}));
