import { ActivityIndicator, Pressable, Text } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

/** Full-width pill CTA (accent bg, onAccent text) — "Start workout" /
 * "Finish" / "Make this my programme" actions. */
export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { theme } = useUnistyles();
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [styles.button, inactive && styles.inactive, pressed && !inactive && styles.pressed]}
    >
      {loading ? <ActivityIndicator color={theme.colors.onAccent} /> : <Text style={styles.label}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.pill,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  inactive: { opacity: 0.5 },
  label: { ...theme.type.heading, color: theme.colors.onAccent },
}));
