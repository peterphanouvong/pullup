import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { Avatar } from '@/features/sticker/components/avatar';

/**
 * The top of a profile, yours or a crewmate's: their sticker (or an
 * initial in a circle), the name, and three counts. Workouts and streak
 * are the identity: how much you've shown up, and for how long without a
 * break.
 */
export function ProfileHeader({
  name,
  avatarUri,
  stats,
  onPressName,
  onPressAvatar,
}: {
  name: string | null;
  avatarUri?: string | null;
  stats: { label: string; value: string }[];
  /** Your own profile renames on tap; a crewmate's doesn't. */
  onPressName?: () => void;
  /** Your own profile retakes the sticker on tap. */
  onPressAvatar?: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <Pressable onPress={onPressAvatar} disabled={onPressAvatar == null} hitSlop={6}>
        <Avatar uri={avatarUri} name={name} size={AVATAR} />
      </Pressable>
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

const AVATAR = 84;

const createStyles = (theme: Theme) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg },
  body: { flex: 1, gap: theme.spacing.sm },
  name: { ...theme.type.title, color: theme.colors.ink },
  stats: { flexDirection: 'row', gap: theme.spacing.xl },
  stat: { gap: 2 },
  statLabel: { ...theme.type.caption, color: theme.colors.inkMuted },
  statValue: { ...theme.type.heading, color: theme.colors.ink, fontVariant: ['tabular-nums'] },
});
