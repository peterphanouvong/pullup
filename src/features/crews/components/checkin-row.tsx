import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { REACTIONS, checkinDetail, checkinHeadline, myReaction, type Checkin, type Reaction } from '../feed';
import { useSetReaction } from '../hooks';

/**
 * One check-in in a crew's feed: who finished what, when and how much,
 * and the three reaction chips. Your own reaction is the filled chip;
 * tapping it again takes it back, tapping another swaps.
 */
export function CheckinRow({ checkin, now }: { checkin: Checkin; now: Date }) {
  const session = useSession();
  const styles = useThemedStyles(createStyles);
  const react = useSetReaction();

  const mine = myReaction(checkin, session.user.id);
  const isMe = checkin.userId === session.user.id;

  function toggle(emoji: Reaction) {
    const next = mine === emoji ? null : emoji;
    if (next == null) haptics.select();
    else haptics.complete();
    react.mutate({ workoutId: checkin.workoutId, emoji: next });
  }

  /** The session itself: yours opens its summary, a crewmate's opens
   * read-only from their profile. */
  function open() {
    haptics.tap();
    if (isMe) router.push(`/workout/${checkin.workoutId}/summary`);
    else router.push({ pathname: '/person/[id]/[workoutId]', params: { id: checkin.userId, workoutId: checkin.workoutId } });
  }

  return (
    <View style={styles.row}>
      <Pressable onPress={open} style={[styles.avatar, isMe && styles.avatarMe]}>
        <Text style={styles.avatarInitial}>{checkin.displayName.charAt(0).toUpperCase()}</Text>
      </Pressable>
      <View style={styles.body}>
        <Pressable onPress={open} style={({ pressed }) => [styles.openable, pressed && styles.chipPressed]}>
          <Text style={styles.headline} numberOfLines={1}>
            {checkinHeadline(checkin, session.user.id)}
          </Text>
          <Text style={styles.detail}>{checkinDetail(checkin, now)}</Text>
        </Pressable>
        <View style={styles.chips}>
          {REACTIONS.map((emoji) => {
            const count = checkin.reactions.filter((r) => r.emoji === emoji).length;
            const names = checkin.reactions.filter((r) => r.emoji === emoji).map((r) => r.displayName);
            const selected = mine === emoji;
            return (
              <Pressable
                key={emoji}
                onPress={() => toggle(emoji)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={names.length > 0 ? `${emoji} from ${names.join(', ')}` : emoji}
                style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.chipPressed]}
              >
                <Text style={styles.chipEmoji}>{emoji}</Text>
                {count > 0 && <Text style={[styles.chipCount, selected && styles.chipCountSelected]}>{count}</Text>}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const AVATAR = 32;

const createStyles = (theme: Theme) => StyleSheet.create({
  row: { flexDirection: 'row', gap: theme.spacing.md, paddingVertical: theme.spacing.sm },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: theme.colors.glassControl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMe: { backgroundColor: theme.colors.accent },
  avatarInitial: { ...theme.type.caption, fontWeight: '700', color: theme.colors.ink },
  body: { flex: 1, gap: 2 },
  openable: { gap: 2 },
  headline: { ...theme.type.body, fontWeight: '600', color: theme.colors.ink },
  detail: { ...theme.type.caption, color: theme.colors.inkMuted, fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', gap: theme.spacing.xs, marginTop: theme.spacing.xs },
  // Same fill as the set-row chips: a control, not a card.
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    paddingHorizontal: theme.spacing.sm + 2,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.glassControl,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: { backgroundColor: theme.colors.doneChip, borderColor: theme.colors.done },
  chipPressed: { opacity: 0.7 },
  chipEmoji: { fontSize: 15 },
  chipCount: { ...theme.type.caption, fontWeight: '700', color: theme.colors.inkMuted, fontVariant: ['tabular-nums'] },
  chipCountSelected: { color: theme.colors.ink },
});
