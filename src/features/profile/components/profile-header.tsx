import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

/**
 * The top of a profile, yours or a crewmate's: an initial in a circle, the
 * name, and three counts. Workouts and streak are the identity: how much
 * you've shown up, and for how long without a break.
 */
export function ProfileHeader({
  name,
  stats,
  onPressName,
}: {
  name: string | null;
  stats: { label: string; value: string }[];
  /** Your own profile renames on tap; a crewmate's doesn't. */
  onPressName?: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.initial}>{(name ?? '?').charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.body}>
        <Pressable onPress={onPressName} disabled={onPressName == null} hitSlop={6}>
          <Text style={styles.name} numberOfLines={1}>
            {name ?? ' '}
          </Text>
        </Pressable>
        <View style={styles.stats}>
          {stats.map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const AVATAR = 72;

const createStyles = (theme: Theme) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontSize: 30, fontWeight: '700', color: theme.colors.onAccent },
  body: { flex: 1, gap: theme.spacing.sm },
  name: { ...theme.type.title, color: theme.colors.ink },
  stats: { flexDirection: 'row', gap: theme.spacing.xl },
  stat: { gap: 2 },
  statLabel: { ...theme.type.caption, color: theme.colors.inkMuted },
  statValue: { ...theme.type.heading, color: theme.colors.ink, fontVariant: ['tabular-nums'] },
});
