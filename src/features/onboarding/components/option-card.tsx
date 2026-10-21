import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { haptics } from '@/lib/haptics';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

/**
 * One answer. Big enough to hit with a thumb, with the chosen one filled
 * in the accent so the state reads from across the room; a multi-select
 * adds a tick so "several" is obviously allowed.
 */
export function OptionCard({
  label,
  caption,
  selected,
  multi = false,
  onPress,
}: {
  label: string;
  caption?: string;
  selected: boolean;
  multi?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      onPress={() => {
        haptics.select();
        onPress();
      }}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ selected, checked: multi ? selected : undefined }}
      style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text style={[styles.label, selected && styles.onSelected]}>{label}</Text>
        {caption != null && <Text style={[styles.caption, selected && styles.captionSelected]}>{caption}</Text>}
      </View>
      {multi && (
        <SymbolView
          name={selected ? 'checkmark.circle.fill' : 'circle'}
          size={22}
          tintColor={selected ? theme.colors.onAccent : theme.colors.inkMuted}
        />
      )}
    </Pressable>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: 64,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.glassBorder,
  },
  cardSelected: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  pressed: { opacity: 0.85 },
  text: { flex: 1, gap: 2 },
  label: { ...theme.type.heading, color: theme.colors.ink },
  caption: { ...theme.type.caption, color: theme.colors.inkMuted },
  onSelected: { color: theme.colors.onAccent },
  captionSelected: { color: theme.colors.onAccent, opacity: 0.8 },
});
