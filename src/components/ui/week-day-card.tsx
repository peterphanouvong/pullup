import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { GlassSurface } from '@/components/ui/glass-surface';
import { NativeButton } from '@/components/ui/native-button';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { stripWeekdayPrefix } from '@/features/programs/labels';
import type { DayKind, ProgramDay } from '@/features/programs/types';
import type { DayMetrics, TodayDayState } from '@/features/workouts/today-state';

const KIND_LABELS: Record<DayKind, string> = {
  lifting: 'LIFT',
  court: 'COURT',
  comp: 'COMP',
  rest: 'REST',
};

/** One row of the Today week list. Reads left-to-right like a plan row: the
 * weekday block, a hairline divider, the session name with its at-a-glance
 * metrics, then a trailing done-check or disclosure chevron. The active day
 * also carries its own full-width start button, so the card is the preview
 * and the button is the commitment.
 *
 * Three time states: today gets a rose edge, passed days fade (undone
 * lifting days read "Missed"), done rows mute behind their check. */
export function WeekDayCard({
  day,
  state,
  isToday,
  passed,
  weekday,
  metrics,
  meta,
  onPress,
  onStart,
  startLabel = 'Start workout',
}: {
  day: ProgramDay;
  state: TodayDayState;
  isToday: boolean;
  /** Calendar-past day (relative to the viewed week) — fades the card. */
  passed: boolean;
  /** "MON"…"SUN" — the day's identity in the left block. */
  weekday: string;
  /** Exercise/set counts for lifting days; null renders `meta` instead. */
  metrics: DayMetrics | null;
  /** Fallback descriptor for non-lifting days (notes, "Rest day", …). */
  meta: string;
  onPress?: () => void;
  /** When provided, the card shows its own primary start button. */
  onStart?: () => void;
  startLabel?: string;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const muted = state === 'done' || passed;

  const body = (
    <View style={styles.row}>
      <View style={styles.dayBlock}>
        <Text style={[styles.weekday, isToday && styles.weekdayToday]}>{weekday}</Text>
        <Text style={styles.kindLabel}>{KIND_LABELS[day.kind]}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.body}>
        <Text style={[styles.title, muted && styles.mutedText]} numberOfLines={2}>
          {stripWeekdayPrefix(day.name)}
        </Text>
        {metrics != null ? (
          <View style={styles.metrics}>
            <View style={styles.metric}>
              <SymbolView name="dumbbell.fill" size={12} tintColor={theme.colors.inkMuted} />
              <Text style={styles.metricText}>{metrics.exercises}</Text>
            </View>
            <View style={styles.metric}>
              <SymbolView name="square.stack.3d.up.fill" size={12} tintColor={theme.colors.inkMuted} />
              <Text style={styles.metricText}>{`${metrics.sets} sets`}</Text>
            </View>
            {state === 'missed' && <Text style={styles.missed}>Missed</Text>}
          </View>
        ) : (
          <Text style={styles.metricText} numberOfLines={2}>
            {meta}
          </Text>
        )}
      </View>

      <View style={styles.trailing}>
        {state === 'done' ? (
          <View style={styles.checkCircle}>
            <SymbolView name="checkmark" size={13} tintColor={theme.colors.onGradient} />
          </View>
        ) : onPress != null ? (
          <SymbolView name="chevron.right" size={15} tintColor={theme.colors.inkMuted} />
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

  const content = (
    <>
      {/* Real SwiftUI Liquid Glass behind the row; the card's own
          translucent fill stays as the pre-iOS-26 fallback. */}
      <GlassSurface cornerRadius={theme.radii.xl} />
      {body}
      {onStart != null && <NativeButton label={startLabel} systemImage="play.fill" onPress={onStart} prominent />}
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...cardStyle, pressed && styles.cardPressed]}>
        {content}
      </Pressable>
    );
  }
  return <View style={cardStyle}>{content}</View>;
}

const createStyles = (theme: Theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.glass,
    borderRadius: theme.radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.glassBorder,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    // Clip the glass layer to the card's rounded corners.
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  cardToday: { borderWidth: 1.5, borderColor: theme.colors.done },
  cardDone: { opacity: 0.75 },
  cardPassed: { opacity: 0.5 },
  cardPressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg },
  dayBlock: { width: 48, gap: 2 },
  weekday: { ...theme.type.title, fontSize: 20, color: theme.colors.ink },
  weekdayToday: { color: theme.colors.done },
  kindLabel: { ...theme.type.label, fontSize: 9, color: theme.colors.inkMuted },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: theme.colors.border },
  body: { flex: 1, gap: 4 },
  title: { ...theme.type.heading, color: theme.colors.ink },
  mutedText: { color: theme.colors.inkMuted },
  metrics: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  metric: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  metricText: { ...theme.type.caption, color: theme.colors.inkMuted, fontVariant: ['tabular-nums'] },
  missed: { ...theme.type.caption, color: theme.colors.comp },
  trailing: { minWidth: 24, alignItems: 'flex-end' },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.done,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
