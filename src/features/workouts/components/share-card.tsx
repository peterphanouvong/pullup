import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { stripWeekdayPrefix } from '@/features/programs/labels';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

/** Aspect close to a story card without being exactly 9:16 — it should read
 * as a pass, not a poster. */
const CARD_WIDTH = 320;

export interface ShareCardStats {
  duration: string;
  volumeKg: number;
  sets: number;
}

/**
 * The capturable artefact: a session pass, not a scoreboard.
 *
 * Built from Pull Up's own vernacular rather than generic gym-app
 * furniture — the weekday stamp and rule from the plan rows, tabular
 * numerals, and the comp countdown as the kicker. The countdown is the
 * reason this card is worth posting: it says what the session was *for*.
 */
export const ShareCard = forwardRef<View, {
  weekday: string;
  title: string;
  dateLabel: string;
  stats: ShareCardStats;
  /** e.g. "3 days to comp." — the kicker along the card's foot. */
  kicker: string;
}>(function ShareCard({ weekday, title, dateLabel, stats, kicker }, ref) {
  const styles = useThemedStyles(createStyles);

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.weekday}>{weekday}</Text>
        <Text style={styles.wordmark}>PULL UP</Text>
      </View>

      <View style={styles.rule} />

      <Text style={styles.title} numberOfLines={2}>
        {stripWeekdayPrefix(title)}
      </Text>
      <Text style={styles.date}>{dateLabel}</Text>

      <View style={styles.stats}>
        <Stat value={stats.duration} label="TIME" />
        <Stat value={`${Math.round(stats.volumeKg)}`} label="VOLUME KG" />
        <Stat value={`${stats.sets}`} label="SETS" />
      </View>

      <Text style={styles.kicker}>{kicker}</Text>
    </View>
  );
});

function Stat({ value, label }: { value: string; label: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  // Opaque, not glass: this gets rasterised and posted, so it can't depend
  // on anything behind it.
  card: {
    width: CARD_WIDTH,
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.done,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekday: { ...theme.type.title, fontSize: 20, color: theme.colors.done },
  wordmark: { ...theme.type.label, color: theme.colors.inkMuted },
  rule: { height: 1, backgroundColor: theme.colors.border },
  title: { ...theme.type.title, color: theme.colors.ink },
  date: { ...theme.type.caption, color: theme.colors.inkMuted },
  stats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.sm },
  stat: { flex: 1, gap: 2 },
  statValue: {
    ...theme.type.title,
    fontSize: 26,
    color: theme.colors.ink,
    fontVariant: ['tabular-nums'],
  },
  statLabel: { ...theme.type.label, fontSize: 9, color: theme.colors.inkMuted },
  kicker: { ...theme.type.label, color: theme.colors.done, marginTop: theme.spacing.xs },
});
