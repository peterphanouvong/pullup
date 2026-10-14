import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import type { Workout } from '../types';

/** Today tab's "Resume workout" card for the one unfinished, non-deleted
 * workout (`useActiveWorkout`) — tapping pushes straight into it. */
export function ResumeBanner({ workout }: { workout: Workout }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable style={styles.card} onPress={() => router.push(`/workout/${workout.id}`)}>
      <SymbolView
        name="play.circle.fill"
        size={28}
        tintColor={theme.colors.onAccent}
        fallback={<Text style={styles.iconFallback}>▶</Text>}
      />
      <View style={styles.body}>
        <Text style={styles.title}>Resume workout</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {workout.title}
        </Text>
      </View>
      <SymbolView name="chevron.right" size={16} tintColor={theme.colors.onAccent} />
    </Pressable>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    ...theme.shadow.card,
  },
  iconFallback: { fontSize: 24, color: theme.colors.onAccent },
  body: { flex: 1, gap: 2 },
  title: { ...theme.type.heading, color: theme.colors.onAccent },
  subtitle: { ...theme.type.caption, color: theme.colors.onAccent },
});
