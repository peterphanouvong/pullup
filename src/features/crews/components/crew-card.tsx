import { ActionSheetIOS, ActivityIndicator, Alert, Share, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui/card';
import { IconCircle } from '@/components/ui/icon-circle';
import { useSession } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { CREW_MAX_MEMBERS, type Crew } from '../api';
import { useCrewWeek, useLeaveCrew } from '../hooks';
import { orderMembers, type CrewWeekRange } from '../week';

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function inviteMessage(name: string, code: string): string {
  return `Join my crew “${name}” on Pull Up. Open Crew, tap +, and enter code ${code}.`;
}

export function shareInvite(name: string, code: string) {
  haptics.tap();
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
export function CrewCard({ crew, range, todayKey }: { crew: Crew; range: CrewWeekRange; todayKey: string }) {
  const session = useSession();
  const styles = useThemedStyles(createStyles);
  const week = useCrewWeek(crew.id, range);
  const leave = useLeaveCrew();

  const members = orderMembers(week.data ?? [], session.user.id);

  function openMenu() {
    haptics.tap();
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: crew.name,
        message: `Invite code ${crew.inviteCode}`,
        options: ['Invite mates', 'Leave crew', 'Cancel'],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
      },
      (index) => {
        if (index === 0) shareInvite(crew.name, crew.inviteCode);
        if (index === 1) confirmLeave();
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
            <View key={member.userId} style={styles.row}>
              <Text style={[styles.memberName, isMe && styles.memberMe]} numberOfLines={1}>
                {isMe ? 'You' : member.displayName}
              </Text>
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
              <Text style={styles.count}>{member.sessionCount}</Text>
            </View>
          );
        })
      )}

      {crew.memberCount <= 1 && !week.isPending && (
        <Text style={styles.meta}>Just you so far. Invite your mates from the ••• menu.</Text>
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
  nameCell: { flex: 1 },
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
  countCell: { width: 24 },
  count: {
    ...theme.type.body,
    width: 24,
    textAlign: 'right',
    color: theme.colors.ink,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  loading: { paddingVertical: theme.spacing.lg },
});
