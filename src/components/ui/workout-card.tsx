import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import type { DayKind } from '@/features/programs/types';

/** Runna-style day card: 4pt kind-colored left edge, title, meta line, and a
 * trailing chevron (tappable) or done-check circle (completed). With no
 * `onPress` it renders as an informational, non-tappable card. */
export function WorkoutCard({
  kind,
  title,
  meta,
  completed = false,
  onPress,
}: {
  kind: DayKind;
  title: string;
  meta?: string;
  completed?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const edgeColor =
    kind === 'lifting' ? theme.colors.accent : kind === 'rest' ? theme.colors.inkMuted : theme.colors.comp;

  const body = (
    <View style={styles.row}>
      <View style={[styles.edge, { backgroundColor: edgeColor }]} />
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {meta != null && <Text style={styles.meta}>{meta}</Text>}
      </View>
      {onPress != null && (
        <View style={styles.trailing}>
          {completed ? (
            <View style={styles.checkCircle}>
              <SymbolView name="checkmark" size={14} tintColor={theme.colors.onAccent} />
            </View>
          ) : (
            <SymbolView name="chevron.right" size={16} tintColor={theme.colors.inkMuted} />
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        {body}
      </Pressable>
    );
  }
  return <View style={styles.card}>{body}</View>;
}

const createStyles = (theme: Theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center' },
  edge: { width: 4, alignSelf: 'stretch' },
  body: { flex: 1, padding: theme.spacing.lg, gap: 4 },
  title: { ...theme.type.heading, color: theme.colors.ink },
  meta: { ...theme.type.caption, color: theme.colors.inkMuted },
  trailing: { paddingRight: theme.spacing.lg },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.done,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
