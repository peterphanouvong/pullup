import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import type { DayKind, ProgramDay } from '@/features/programs/types';
import type { TodayDayState } from '@/features/workouts/today-state';

/** Day names in the seed data lead with the weekday ("Mon — Lower power");
 * the card's eyebrow already says MON, so the title drops the prefix. */
function stripWeekdayPrefix(name: string): string {
  return name.replace(/^(mon|tue|wed|thu|fri|sat|sun)[a-z]*\s*[—–-]\s*/i, '');
}

const TILE_SYMBOLS: Record<DayKind, SFSymbol> = {
  lifting: 'dumbbell.fill',
  court: 'figure.basketball',
  comp: 'trophy.fill',
  rest: 'moon.zzz.fill',
};

/** One row of the Today week checklist, modelled on Nike's plan rows: a
 * kind-icon tile standing in for Nike's artwork square, a weekday eyebrow
 * ("Day 1" in Nike, "MON"/"TODAY" here), title + meta, and a rose "done"
 * check circle on the right. Three time states: today carries a rose border
 * indicator, passed days fade hard (lifting ones read "Missed"), done rows
 * mute gently behind their check. */
export function WeekDayCard({
  day,
  state,
  isToday,
  passed,
  eyebrow,
  meta,
  onPress,
}: {
  day: ProgramDay;
  state: TodayDayState;
  isToday: boolean;
  /** Calendar-past day (relative to the viewed week) — fades the card. */
  passed: boolean;
  /** Weekday label ("MON"…"SUN") — replaced by "TODAY" when `isToday`. */
  eyebrow: string;
  meta: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const muted = state === 'done' || passed;

  // Tile palette per kind: lifting gets the bold ink tile (Nike's statement
  // square), comp the rose accent, court/rest stay quiet neutrals.
  const tileStyle =
    day.kind === 'lifting'
      ? styles.tileLifting
      : day.kind === 'comp'
        ? styles.tileComp
        : styles.tileQuiet;
  const tileTint =
    day.kind === 'lifting'
      ? theme.colors.canvas
      : day.kind === 'comp'
        ? theme.colors.onGradient
        : theme.colors.inkMuted;

  const body = (
    <View style={styles.row}>
      <View style={[styles.tile, tileStyle]}>
        <SymbolView name={TILE_SYMBOLS[day.kind]} size={22} tintColor={tileTint} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.eyebrow, isToday && styles.eyebrowToday]}>
          {isToday ? 'TODAY' : eyebrow}
        </Text>
        <Text style={[styles.title, muted && styles.mutedText]}>{stripWeekdayPrefix(day.name)}</Text>
        <Text style={styles.meta}>
          {state === 'missed' ? `Missed · ${meta}` : meta}
        </Text>
      </View>
      <View style={styles.trailing}>
        {state === 'done' ? (
          <View style={styles.checkCircle}>
            <SymbolView name="checkmark" size={14} tintColor={theme.colors.onGradient} />
          </View>
        ) : onPress != null ? (
          <SymbolView name="chevron.right" size={16} tintColor={theme.colors.inkMuted} />
        ) : null}
      </View>
    </View>
  );

  const cardStyle = [
    styles.card,
    isToday && styles.cardToday,
    state === 'done' && styles.cardDone,
    passed && state !== 'done' && styles.cardPassed,
  ];

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
  cardToday: { borderWidth: 1.5, borderColor: theme.colors.done },
  cardDone: { opacity: 0.75 },
  cardPassed: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg, gap: theme.spacing.lg },
  tile: {
    width: 52,
    height: 52,
    borderRadius: theme.radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLifting: { backgroundColor: theme.colors.ink },
  tileComp: { backgroundColor: theme.colors.done },
  tileQuiet: { backgroundColor: theme.colors.canvas },
  body: { flex: 1, gap: 2 },
  eyebrow: { ...theme.type.label, color: theme.colors.inkMuted },
  eyebrowToday: { color: theme.colors.done },
  title: { ...theme.type.heading, color: theme.colors.ink },
  mutedText: { color: theme.colors.inkMuted },
  meta: { ...theme.type.caption, color: theme.colors.inkMuted },
  trailing: { paddingLeft: theme.spacing.sm },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.done,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
