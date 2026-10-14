import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import type { ProgramDay } from '@/features/programs/types';
import type { TodayDayState } from '@/features/workouts/today-state';

/** One row of the Today week checklist (Nike-style). Builds on WorkoutCard's
 * look (kind edge, title/meta, done check) with week-list states: a promoted
 * TODAY treatment, muted done rows, a "Missed" marker on past undone lifting
 * days, and quiet informational rows for court/rest/comp days. */
export function WeekDayCard({
  day,
  state,
  isToday,
  meta,
  onPress,
}: {
  day: ProgramDay;
  state: TodayDayState;
  isToday: boolean;
  meta: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const edgeColor =
    day.kind === 'lifting'
      ? theme.colors.accent
      : day.kind === 'rest'
        ? theme.colors.inkMuted
        : theme.colors.comp;

  const muted = state === 'done' || (state === 'info' && !isToday);

  const body = (
    <View style={styles.row}>
      <View style={[styles.edge, { backgroundColor: edgeColor }]} />
      <View style={styles.body}>
        {isToday && <Text style={styles.todayEyebrow}>TODAY</Text>}
        <Text style={[styles.title, muted && styles.mutedText]}>{day.name}</Text>
        <Text style={styles.meta}>
          {state === 'missed' ? `Missed · ${meta}` : meta}
        </Text>
      </View>
      <View style={styles.trailing}>
        {state === 'done' ? (
          <View style={styles.checkCircle}>
            <SymbolView name="checkmark" size={14} tintColor={theme.colors.onAccent} />
          </View>
        ) : onPress != null ? (
          <SymbolView name="chevron.right" size={16} tintColor={theme.colors.inkMuted} />
        ) : null}
      </View>
    </View>
  );

  const cardStyle = [styles.card, isToday && styles.cardToday, muted && styles.cardMuted];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...cardStyle, pressed && styles.pressed]}>
        {body}
      </Pressable>
    );
  }
  return <View style={cardStyle}>{body}</View>;
}

const createStyles = (theme: Theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  cardToday: {
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
  },
  cardMuted: { opacity: 0.75 },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center' },
  edge: { width: 4, alignSelf: 'stretch' },
  body: { flex: 1, padding: theme.spacing.lg, gap: 4 },
  todayEyebrow: { ...theme.type.label, color: theme.colors.accent },
  title: { ...theme.type.heading, color: theme.colors.ink },
  mutedText: { color: theme.colors.inkMuted },
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
