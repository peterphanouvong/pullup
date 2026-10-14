import type { ReactNode } from 'react';
import { Pressable, StyleSheet as RNStyleSheet, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

// Always a Pressable (even with no onPress) so the style-callback signature
// stays uniform; `pressed` is only honored visually when onPress is set.

/** The signature list row: an oversized numeral + optional caption on the
 * left rail, a title/subtitle block to the right, hairline divider below. */
export function NumeralRow({
  numeral,
  caption,
  title,
  subtitle,
  trailing,
  numeralColor,
  onPress,
}: {
  numeral: string | number;
  caption?: string;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  numeralColor?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={onPress == null}
      style={({ pressed }) => [styles.row, onPress != null && pressed && styles.pressed]}
    >
      <View style={styles.rail}>
        <Text style={[styles.numeral, numeralColor != null && { color: numeralColor }]}>{numeral}</Text>
        {caption != null && <Text style={styles.caption}>{caption}</Text>}
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle != null && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: RNStyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  pressed: { opacity: 0.7 },
  rail: { width: 48, alignItems: 'center' },
  numeral: { ...theme.type.numeralXL, color: theme.colors.ink },
  caption: { ...theme.type.label, color: theme.colors.inkMuted, marginTop: 2 },
  content: { flex: 1, gap: 2 },
  title: { ...theme.type.heading, color: theme.colors.ink },
  subtitle: { ...theme.type.caption, color: theme.colors.inkMuted },
}));
