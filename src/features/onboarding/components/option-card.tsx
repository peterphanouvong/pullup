import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { haptics } from '@/lib/haptics';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

/**
 * One answer. Big enough to hit with a thumb. The chosen one inverts to
 * ink on canvas, Cal AI style, so the state reads from across the room
 * without borrowing the accent, which the Continue button owns on these
 * screens. A multi-select adds a tick so "several" is obviously allowed.
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
        <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
        {caption != null && <Text style={[styles.caption, selected && styles.captionSelected]}>{caption}</Text>}
      </View>
      {multi && (
        <SymbolView
          name={selected ? 'checkmark.circle.fill' : 'circle'}
          size={22}
          tintColor={selected ? theme.colors.canvas : theme.colors.inkMuted}
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
  // Inverted: ink fill, canvas text. White on black in the dark theme,
  // black on white in the light one.
  cardSelected: { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink },
  pressed: { opacity: 0.85 },
  text: { flex: 1, gap: 2 },
  label: { ...theme.type.heading, color: theme.colors.ink },
  caption: { ...theme.type.caption, color: theme.colors.inkMuted },
  labelSelected: { color: theme.colors.canvas },
  captionSelected: { color: theme.colors.canvas, opacity: 0.7 },
});
