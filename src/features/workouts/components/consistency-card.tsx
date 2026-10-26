import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import { GlassSurface } from '@/components/ui/glass-surface';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DOT = 30;

/**
 * The celebration's case for consistency: this week as seven dots (Monday
 * first), the count against your target, the streak, and who in your crew
 * has trained too. The point of the app is showing up, repeatedly, with
 * people, so this is what the finish screen dwells on rather than volume.
 *
 * Today's dot is stamped on a beat after the hero lands, so the session
 * visibly joins the week.
 */
export function ConsistencyCard({
  days,
  todayIndex,
  sessions,
  target,
  streak,
  crewLine,
}: {
  /** Monday-first: did each day of this week have a session. */
  days: boolean[];
  /** 0 = Monday. */
  todayIndex: number;
  sessions: number;
  target: number;
  streak: number;
  /** Null while there's no crew, or the crew's week hasn't loaded. */
  crewLine: string | null;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const met = sessions >= target;
  const remaining = Math.max(0, target - sessions);
  const detail = met
    ? streak >= 2
      ? `Week complete. ${streak} weeks running.`
      : 'Week complete.'
    : streak >= 1
      ? `${remaining} more this week keeps the streak.`
      : `${remaining} more makes this week count.`;

  const land = useSharedValue(0);
  useEffect(() => {
    land.set(withDelay(520, withTiming(1, { duration: 340, easing: Easing.out(Easing.back(2.6)) })));
  }, [land]);
  const landStyle = useAnimatedStyle(() => ({ transform: [{ scale: land.get() }] }));

  return (
    <View style={styles.card}>
      {/* Glass over the finish screen's moving field: the light comes
          from the page, the card just catches it. */}
      <GlassSurface cornerRadius={theme.radii.xl} />

      <View style={styles.top}>
        <View>
          <Text style={styles.eyebrow}>THIS WEEK</Text>
          <Text style={styles.numeral}>
            {sessions}
            <Text style={styles.ofTarget}>{` / ${target}`}</Text>
          </Text>
        </View>
        {streak > 0 && (
          <View style={styles.streakChip}>
            <SymbolView name="flame.fill" size={13} tintColor={theme.colors.comp} />
            <Text style={styles.streakText}>{`${streak} wk streak`}</Text>
          </View>
        )}
      </View>

      <View style={styles.dots}>
        {days.map((trained, i) => {
          const isToday = i === todayIndex;
          const dot = (
            <View style={[styles.dot, trained && styles.dotTrained, isToday && !trained && styles.dotToday]}>
              {trained && <SymbolView name="checkmark" size={12} weight="bold" tintColor={theme.colors.onAccent} />}
            </View>
          );
          return (
            <View key={i} style={styles.day}>
              {isToday && trained ? <Animated.View style={landStyle}>{dot}</Animated.View> : dot}
              <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{WEEKDAYS[i]}</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.detail}>{detail}</Text>

      {crewLine != null && (
        <View style={styles.crewRow}>
          <SymbolView name="person.2.fill" size={13} tintColor={theme.colors.inkMuted} />
          <Text style={styles.crewText}>{crewLine}</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.glass,
    borderRadius: theme.radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.glassBorder,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    overflow: 'hidden',
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  eyebrow: { ...theme.type.label, color: theme.colors.inkMuted },
  numeral: { ...theme.type.numeralXL, fontSize: 40, color: theme.colors.ink },
  ofTarget: { ...theme.type.title, color: theme.colors.inkMuted, fontWeight: '600' },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.glassControl,
  },
  streakText: { ...theme.type.caption, color: theme.colors.ink, fontVariant: ['tabular-nums'] },
  dots: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: theme.spacing.xs },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: theme.colors.glassControl,
    alignItems: 'center',
    justifyContent: 'center',
    // Always present, so the ring on today never shifts the row.
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dotTrained: { backgroundColor: theme.colors.done },
  dotToday: { borderColor: theme.colors.done },
  dayLabel: { ...theme.type.caption, fontSize: 11, color: theme.colors.inkMuted },
  dayLabelToday: { color: theme.colors.ink, fontWeight: '700' },
  detail: { ...theme.type.body, color: theme.colors.ink },
  crewRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  crewText: { ...theme.type.caption, color: theme.colors.inkMuted, flex: 1 },
});
