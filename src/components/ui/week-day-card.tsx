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
 * Days you didn't do carry no penalty treatment: a skipped session is a
 * fact, not a scolding, and fading it only makes the week harder to read.
 * Done is marked the same way a completed set row is — a filled tick and a
 * soft `doneRow` wash — never by dimming, which reads as disabled. */
export function WeekDayCard({
  day,
  state,
  isToday,
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

  const done = state === 'done';

  const body = (
    <View style={styles.row}>
      <View style={styles.dayBlock}>
        <Text style={styles.weekday}>{weekday}</Text>
        <Text style={styles.kindLabel}>{KIND_LABELS[day.kind]}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
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
          </View>
        ) : (
          <Text style={styles.metricText} numberOfLines={2}>
            {meta}
          </Text>
        )}
      </View>

      <View style={styles.trailing}>
        {done ? (
          <View style={styles.checkCircle}>
            <SymbolView name="checkmark" size={13} tintColor={theme.colors.onGradient} />
          </View>
        ) : onPress != null ? (
          <SymbolView name="chevron.right" size={15} tintColor={theme.colors.inkMuted} />
        ) : null}
      </View>
    </View>
  );

  const cardStyle = [styles.card, done && styles.cardDone, isToday && styles.cardToday];

  const content = (
    <>
      {/* Real SwiftUI Liquid Glass behind the row; the card's own
          translucent fill stays as the pre-iOS-26 fallback. */}
      <GlassSurface cornerRadius={theme.radii.xl} />
      {done && <View style={styles.doneWash} pointerEvents="none" />}
      {body}
      {onStart != null && <NativeButton label={startLabel} systemImage="play.fill" onPress={onStart} variant="primary" />}
    </>
  );

  const card =
    onPress != null ? (
      <Pressable onPress={onPress} style={({ pressed }) => [...cardStyle, pressed && styles.cardPressed]}>
        {content}
      </Pressable>
    ) : (
      <View style={cardStyle}>{content}</View>
    );

  // Today glows and gets a thin edge. The halo lives on an unclipped wrapper: the card itself has
  // `overflow: 'hidden'` (to clip its glass layer), which clips any shadow
  // drawn on it too.
  return isToday ? <View style={styles.todayGlow}>{card}</View> : card;
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
  todayGlow: { borderRadius: theme.radii.xl, ...theme.shadow.glow },
  // A thin edge to go with the glow. Applied after `cardDone`, so it wins
  // when today is also done.
  cardToday: { borderWidth: 1, borderColor: theme.colors.done },
  // Done edge: the wash's colour carried to the hairline, so the card reads
  // as complete at full strength rather than greyed out.
  cardDone: { borderColor: theme.colors.doneRow },
  doneWash: { ...StyleSheet.absoluteFill, backgroundColor: theme.colors.doneRow },
  cardPressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg },
  dayBlock: { width: 48, gap: 2 },
  weekday: { ...theme.type.title, fontSize: 20, color: theme.colors.ink },
  kindLabel: { ...theme.type.label, fontSize: 9, color: theme.colors.inkMuted },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: theme.colors.border },
  body: { flex: 1, gap: 4 },
  title: { ...theme.type.heading, color: theme.colors.ink },
  metrics: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  metric: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  metricText: { ...theme.type.caption, color: theme.colors.inkMuted, fontVariant: ['tabular-nums'] },
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
