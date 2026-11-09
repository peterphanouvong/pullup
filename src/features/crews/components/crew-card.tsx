import { ActionSheetIOS, ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Card } from '@/components/ui/card';
import { IconCircle } from '@/components/ui/icon-circle';
import { useSession } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { joinCrewLink } from '@/lib/links';
import { capture } from '@/lib/analytics';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { CREW_MAX_MEMBERS, pickCrewCover, type Crew } from '../api';
import { useCrewAvatars, useCrewFeed, useCrewMembers, useCrewWeek, useLeaveCrew, usePokes, useSetCrewCover } from '../hooks';
import { feedRange } from '../feed';
import { CheckinRow } from './checkin-row';
import type { CrewWeekRange } from '../week';
import { Avatar } from '@/features/sticker/components/avatar';

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** An https link, so the messages app makes it tappable, and iOS hands it
 * straight to the app rather than the browser (see `lib/links.ts`). The code
 * is still spelt out for anyone who ends up typing it in by hand. */
export function inviteLink(code: string): string {
  return joinCrewLink(code);
}

export function inviteMessage(name: string, code: string): string {
  return `Join my crew “${name}” on Pull Up: ${inviteLink(code)}\n\nOr open Crew, tap +, and enter code ${code}.`;
}

export function shareInvite(name: string, code: string) {
  haptics.tap();
  capture('crew_invite_shared', {});
  void Share.share({ message: inviteMessage(name, code) });
}

/**
 * One crew's week: a row per member, a dot per day, filled where they
 * trained. The point is that someone notices — so the grid is the whole
 * card, with you on the top row.
 *
 * Days nobody has reached yet stay empty, the same as a missed day: no
 * crosses, no red. A gap is a fact, not a scolding.
 */
export function CrewCard({ crew, range, todayKey, now }: { crew: Crew; range: CrewWeekRange; todayKey: string; now: Date }) {
  const session = useSession();
  const styles = useThemedStyles(createStyles);
  const week = useCrewWeek(crew.id, range);
  const feed = useCrewFeed(crew.id, feedRange(now));
  const leave = useLeaveCrew();
  const setCover = useSetCrewCover();
  const pokes = usePokes();

  /** Any member can change the crew's cover photo: it's the crew's, not
   * the creator's. */
  async function changeCover() {
    const picked = await pickCrewCover();
    if (picked == null) return;
    haptics.commit();
    setCover.mutate({ crewId: crew.id, picked }, { onError: (e) => Alert.alert('Couldn’t set the cover', e.message) });
  }

  const pokedMeToday = (pokes.data ?? []).filter((p) => p.crewId === crew.id && p.toUser === session.user.id);
  const pokedByMeToday = new Set((pokes.data ?? []).filter((p) => p.fromUser === session.user.id).map((p) => p.toUser));

  /** A crewmate's row: their profile, or one nudge a day. No messages:
   * "You training today?" is the whole vocabulary. */
  function openMember(member: { userId: string; displayName: string }) {
    haptics.tap();
    const already = pokedByMeToday.has(member.userId);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: member.displayName,
        message: already ? 'You’ve poked them today. Once a day is plenty.' : undefined,
        options: ['View profile', already ? 'Poked today 👋' : `Poke ${member.displayName} 👋`, 'Cancel'],
        cancelButtonIndex: 2,
        disabledButtonIndices: already ? [1] : [],
      },
      (index) => {
        if (index === 0) {
          router.push({ pathname: '/person/[id]', params: { id: member.userId } });
          return;
        }
        if (index !== 1 || already) return;
        haptics.commit();
        pokes.poke.mutate(
          { crewId: crew.id, userId: member.userId },
          { onError: (e) => Alert.alert('Couldn’t poke', e.message) },
        );
      },
    );
  }

  const members = useCrewMembers(week.data, range);
  const avatars = useCrewAvatars(members.map((m) => m.userId));

  function openMenu() {
    haptics.tap();
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: crew.name,
        message: `Invite code ${crew.inviteCode}`,
        options: ['Invite mates', crew.coverUrl ? 'Change cover photo' : 'Add a cover photo', 'Leave crew', 'Cancel'],
        destructiveButtonIndex: 2,
        cancelButtonIndex: 3,
      },
      (index) => {
        if (index === 0) shareInvite(crew.name, crew.inviteCode);
        if (index === 1) void changeCover();
        if (index === 2) confirmLeave();
      },
    );
  }

  function confirmLeave() {
    haptics.warning();
    const last = crew.memberCount <= 1;
    Alert.alert(
      `Leave ${crew.name}?`,
      last ? 'You’re the last one in it, so the crew will be closed.' : 'You can rejoin later with the invite code.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () =>
            leave.mutate(crew.id, {
              onError: (e) => Alert.alert('Couldn’t leave the crew', e.message),
            }),
        },
      ],
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>
            {crew.name}
          </Text>
          <Text style={styles.meta}>{`${crew.memberCount} of ${CREW_MAX_MEMBERS} · code ${crew.inviteCode}`}</Text>
        </View>
        <IconCircle name="ellipsis" fallback="…" size={32} onPress={openMenu} />
      </View>

      <View style={styles.row}>
        <View style={styles.nameCell} />
        {WEEKDAY_INITIALS.map((d, i) => (
          <Text key={i} style={[styles.weekday, range.days[i] === todayKey && styles.weekdayToday]}>
            {d}
          </Text>
        ))}
        <View style={styles.countCell} />
      </View>

      {week.isPending ? (
        <ActivityIndicator style={styles.loading} />
      ) : week.isError ? (
        <Text style={styles.meta}>Couldn’t load this week. Pull to refresh.</Text>
      ) : (
        members.map((member) => {
          const isMe = member.userId === session.user.id;
          return (
            <Pressable
              key={member.userId}
              disabled={isMe}
              onPress={() => openMember(member)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.member}>
                <Avatar uri={avatars[member.userId]} name={member.displayName} size={24} />
                <Text style={[styles.memberName, isMe && styles.memberMe]} numberOfLines={1}>
                  {isMe ? 'You' : member.displayName}
                  {member.streak >= 2 && <Text style={styles.streak}>{`  🔥${member.streak}`}</Text>}
                </Text>
              </View>
              {range.days.map((day) => (
                <View key={day} style={styles.dotCell}>
                  <View
                    style={[
                      styles.dot,
                      member.trainedDays.has(day) && styles.dotTrained,
                      day === todayKey && styles.dotToday,
                    ]}
                  />
                </View>
              ))}
              <Text style={[styles.count, member.sessionCount >= member.weeklyTarget && styles.countMet]}>
                {member.sessionCount}
                <Text style={styles.countOf}>{`/${member.weeklyTarget}`}</Text>
              </Text>
            </Pressable>
          );
        })
      )}

      {pokedMeToday.length > 0 && (
        <Text style={styles.poked}>
          {`👋 ${pokedMeToday.map((p) => members.find((m) => m.userId === p.fromUser)?.displayName ?? 'A crewmate').join(', ')} poked you. You training today?`}
        </Text>
      )}

      {crew.memberCount <= 1 && !week.isPending && (
        <Text style={styles.meta}>Just you so far. Invite your mates from the ••• menu.</Text>
      )}

      {/* The last seven days' sessions, newest first. Each is a check-in
          the crew can react to; the whole point is that someone notices. */}
      {feed.data != null && feed.data.length > 0 && (
        <View style={styles.feed}>
          <Text style={styles.feedLabel}>RECENT</Text>
          {feed.data.map((checkin) => (
            <CheckinRow key={checkin.workoutId} checkin={checkin} now={now} />
          ))}
        </View>
      )}
    </Card>
  );
}

const DOT = 18;

const createStyles = (theme: Theme) => StyleSheet.create({
  card: { gap: theme.spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.xs },
  headerText: { flex: 1, gap: 2 },
  name: { ...theme.type.heading, color: theme.colors.ink },
  meta: { ...theme.type.caption, color: theme.colors.inkMuted, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 28 },
  rowPressed: { opacity: 0.7 },
  streak: { ...theme.type.caption, color: theme.colors.inkMuted },
  poked: { ...theme.type.caption, color: theme.colors.ink, marginTop: theme.spacing.xs },
  nameCell: { flex: 1 },
  member: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  memberName: { ...theme.type.body, flex: 1, color: theme.colors.ink, paddingRight: theme.spacing.sm },
  memberMe: { fontWeight: '700' },
  weekday: { ...theme.type.label, width: DOT + 8, textAlign: 'center', color: theme.colors.inkMuted },
  weekdayToday: { color: theme.colors.ink },
  dotCell: { width: DOT + 8, alignItems: 'center' },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: theme.colors.glassControl,
    // Always present so today's ring never shifts the dot.
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dotTrained: { backgroundColor: theme.colors.done, ...theme.shadow.glow, shadowRadius: 6 },
  dotToday: { borderColor: theme.colors.done },
  countCell: { width: 40 },
  countOf: { ...theme.type.caption, fontWeight: '400', color: theme.colors.inkMuted },
  countMet: { color: theme.colors.done },
  count: {
    ...theme.type.body,
    width: 40,
    textAlign: 'right',
    color: theme.colors.ink,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  loading: { paddingVertical: theme.spacing.lg },
  feed: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.glassBorder,
  },
  feedLabel: { ...theme.type.label, color: theme.colors.inkMuted, marginBottom: theme.spacing.xs },
});
