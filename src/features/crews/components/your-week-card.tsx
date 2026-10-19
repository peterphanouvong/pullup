import { ActionSheetIOS, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui/card';
import { haptics } from '@/lib/haptics';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { DEFAULT_WEEKLY_TARGET } from '@/features/account/api';
import { useProfile, useSaveWeeklyTarget } from '@/features/account/hooks';
import { useFinishedWorkouts } from '@/features/workouts/hooks';
import { sessionsThisWeek, weekStreak } from '../streak';
import type { CrewWeekRange } from '../week';
import { localDayOf } from '@/features/programs/calendar';

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * Your own week, above the crews: sessions done against your weekly
 * target, a dot per day, and the streak. Tap to change the target.
 *
 * The target is the one number the crew holds you to, so it's yours to
 * set, 1–7. The streak counts whole weeks on target; this week joins it
 * the moment it's met and can't break it before Sunday's out.
 */
export function YourWeekCard({ range, todayKey, now }: { range: CrewWeekRange; todayKey: string; now: Date }) {
  const styles = useThemedStyles(createStyles);
  const profile = useProfile();
  const saveTarget = useSaveWeeklyTarget();
  const finished = useFinishedWorkouts();

  const target = profile.data?.weeklyTarget ?? DEFAULT_WEEKLY_TARGET;
  const starts = finished.map((f) => f.workout.started_at);
  const done = sessionsThisWeek(starts, now);
  const streak = weekStreak(starts, target, now);
  const trained = new Set(starts.map(localDayOf));
  const met = done >= target;

  function chooseTarget() {
    haptics.tap();
    const options = [1, 2, 3, 4, 5, 6, 7].map((n) => `${n} ${n === 1 ? 'session' : 'sessions'} a week`);
    ActionSheetIOS.showActionSheetWithOptions(
      { title: 'Weekly target', message: 'What your crew holds you to.', options: [...options, 'Cancel'], cancelButtonIndex: 7 },
      (index) => {
        if (index >= 7 || index + 1 === target) return;
        haptics.select();
        saveTarget.mutate(index + 1);
      },
    );
  }

  const streakLine =
    streak >= 2 ? `${streak}-week streak 🔥` : met ? 'Target hit. Keep it going next week.' : streak === 1 ? 'On target this week' : null;

  return (
    <Card onPress={chooseTarget} style={styles.card}>
      <View style={styles.top}>
        <View style={styles.numbers}>
          <Text style={styles.label}>YOUR WEEK</Text>
          <Text style={styles.count}>
            {done}
            <Text style={styles.countOf}>{`/${target}`}</Text>
          </Text>
        </View>
        <View style={styles.days}>
          {range.days.map((day, i) => (
            <View key={day} style={styles.dayCell}>
              <Text style={[styles.weekday, day === todayKey && styles.weekdayToday]}>{WEEKDAY_INITIALS[i]}</Text>
              <View style={[styles.dot, trained.has(day) && styles.dotTrained, day === todayKey && styles.dotToday]} />
            </View>
          ))}
        </View>
      </View>
      <Text style={styles.foot}>
        {streakLine ?? `${target - done} to go. Tap to change your target.`}
      </Text>
    </Card>
  );
}

const DOT = 14;

const createStyles = (theme: Theme) => StyleSheet.create({
  card: { gap: theme.spacing.sm },
  top: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: theme.spacing.md },
  numbers: { gap: 2 },
  label: { ...theme.type.label, color: theme.colors.inkMuted },
  count: { ...theme.type.display, color: theme.colors.done, fontVariant: ['tabular-nums'] },
  countOf: { ...theme.type.heading, color: theme.colors.inkMuted },
  days: { flexDirection: 'row', gap: theme.spacing.xs, paddingBottom: theme.spacing.xs },
  dayCell: { alignItems: 'center', gap: 4, width: DOT + 6 },
  weekday: { ...theme.type.label, fontSize: 10, color: theme.colors.inkMuted },
  weekdayToday: { color: theme.colors.ink },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: theme.colors.glassControl,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dotTrained: { backgroundColor: theme.colors.done, ...theme.shadow.glow, shadowRadius: 5 },
  dotToday: { borderColor: theme.colors.done },
  foot: { ...theme.type.caption, color: theme.colors.inkMuted },
});
