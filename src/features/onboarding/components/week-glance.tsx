import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { stripWeekdayPrefix } from '@/features/programs/labels';
import type { PlanDayKind, PlanWeek } from '@/features/programs/plan';

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const KIND_LABELS: Record<PlanDayKind, string> = { lifting: 'LIFT', court: 'COURT', rest: 'REST', comp: 'COMP' };

/** A week of the proposal at a glance: seven rows, what each day is, and
 * how much is in it. Enough to judge "does this fit my week" before
 * anything is scrolled into. */
export function WeekGlance({ week }: { week: PlanWeek }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.list}>
      {week.days.map((day, i) => {
        const dim = day.kind === 'rest';
        const meta =
          day.kind === 'lifting'
            ? `${day.exercises.length} exercise${day.exercises.length === 1 ? '' : 's'}`
            : (day.notes ?? (day.kind === 'comp' ? 'Competition' : day.kind === 'court' ? 'Court session' : 'Rest'));
        return (
          <View key={i} style={[styles.row, dim && styles.rowDim]}>
            <Text style={styles.weekday}>{WEEKDAYS[i]}</Text>
            <View style={styles.body}>
              <Text style={styles.name} numberOfLines={1}>
                {stripWeekdayPrefix(day.name)}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {meta}
              </Text>
            </View>
            <Text style={[styles.kind, day.kind === 'comp' && styles.kindComp]}>{KIND_LABELS[day.kind]}</Text>
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  list: { gap: theme.spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.glassBorder,
  },
  rowDim: { opacity: 0.6 },
  weekday: { ...theme.type.label, color: theme.colors.inkMuted, width: 36 },
  body: { flex: 1, gap: 1 },
  name: { ...theme.type.body, fontWeight: '600', color: theme.colors.ink },
  meta: { ...theme.type.caption, color: theme.colors.inkMuted },
  kind: { ...theme.type.label, color: theme.colors.inkMuted },
  kindComp: { color: theme.colors.comp },
});
