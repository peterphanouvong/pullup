import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { stripWeekdayPrefix } from '@/features/programs/labels';
import type { DayKind } from '@/features/programs/types';

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const KIND_LABELS: Record<DayKind, string> = { lifting: 'LIFT', court: 'COURT', rest: 'REST', comp: 'COMP' };

/** The least a day needs to be glanced at: the plan's days and a written
 * programme's days both have this. */
export interface GlanceDay {
  name: string;
  kind: DayKind;
  notes: string | null;
  exercises: unknown[];
}

/** A week at a glance: seven rows, what each day is, and how much is in
 * it. Enough to judge "does this fit my week" before anything is scrolled
 * into. With `onPressDay` every row opens, so the meat of a day is one
 * tap away. */
export function WeekGlance({ days, onPressDay }: { days: GlanceDay[]; onPressDay?: (index: number) => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.list}>
      {days.map((day, i) => {
        const meta =
          day.kind === 'lifting'
            ? `${day.exercises.length} exercise${day.exercises.length === 1 ? '' : 's'}`
            : (day.notes ?? (day.kind === 'comp' ? 'Competition' : day.kind === 'court' ? 'Court session' : 'Rest'));
        return (
          <Pressable
            key={i}
            disabled={onPressDay == null}
            onPress={() => onPressDay?.(i)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
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
            {onPressDay != null && <SymbolView name="chevron.right" size={13} tintColor={theme.colors.inkMuted} />}
          </Pressable>
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
  rowPressed: { opacity: 0.7 },
  weekday: { ...theme.type.label, color: theme.colors.inkMuted, width: 36 },
  body: { flex: 1, gap: 1 },
  name: { ...theme.type.body, fontWeight: '600', color: theme.colors.ink },
  meta: { ...theme.type.caption, color: theme.colors.inkMuted },
  kind: { ...theme.type.label, color: theme.colors.inkMuted },
  kindComp: { color: theme.colors.comp },
});
