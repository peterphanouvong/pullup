import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Card } from '@/components/ui/card';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import type { WorkoutCardData } from '@/features/stats/stats';
import { sessionDate, shortDuration, thousands } from '../format';

const SHOWN_EXERCISES = 3;

/**
 * One session in a profile's list, Hevy-style: when, what it was called,
 * time / volume / records, then the first few exercises as "4 sets Deadlift".
 * Taps through to the session; the share button is only on your own.
 *
 * A real glass card (the default `Card`): Profile and Activity both list
 * sessions with this, so the two stay the same thing in two places.
 */
export function SessionCard({
  data,
  now,
  onPress,
  onShare,
}: {
  data: WorkoutCardData;
  now: Date;
  onPress: () => void;
  onShare?: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const more = data.exercises.length - SHOWN_EXERCISES;

  return (
    <Card style={styles.card} onPress={onPress}>
      <View style={styles.top}>
        <View style={styles.titleBlock}>
          <Text style={styles.date}>{sessionDate(data.workout.started_at, now)}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {data.workout.title}
          </Text>
        </View>
        {onShare != null && (
          <Pressable onPress={onShare} hitSlop={10} accessibilityLabel="Share session">
            <SymbolView name="square.and.arrow.up" size={18} tintColor={theme.colors.inkMuted} />
          </Pressable>
        )}
      </View>

      <View style={styles.stats}>
        <Stat label="Time" value={shortDuration(data.durationSeconds)} />
        {data.volumeKg > 0 && <Stat label="Volume" value={`${thousands(data.volumeKg)} kg`} />}
        {data.records > 0 && <Stat label="Records" value={`🏅 ${data.records}`} />}
      </View>

      {data.exercises.length > 0 && (
        <View style={styles.exercises}>
          {data.exercises.slice(0, SHOWN_EXERCISES).map((e, i) => (
            <Text key={`${e.name}-${i}`} style={styles.exercise} numberOfLines={1}>
              <Text style={styles.sets}>{`${e.sets} ${e.sets === 1 ? 'set' : 'sets'}  `}</Text>
              {e.name}
            </Text>
          ))}
          {more > 0 && <Text style={styles.more}>{`+ ${more} more`}</Text>}
        </View>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  card: { gap: theme.spacing.md },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
  titleBlock: { flex: 1, gap: 2 },
  date: { ...theme.type.caption, color: theme.colors.inkMuted },
  title: { ...theme.type.heading, color: theme.colors.ink },
  stats: { flexDirection: 'row', gap: theme.spacing.xl },
  stat: { gap: 2 },
  statLabel: { ...theme.type.caption, color: theme.colors.inkMuted },
  statValue: { ...theme.type.body, color: theme.colors.ink, fontWeight: '600', fontVariant: ['tabular-nums'] },
  exercises: {
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  exercise: { ...theme.type.body, color: theme.colors.ink },
  sets: { color: theme.colors.inkMuted, fontVariant: ['tabular-nums'] },
  more: { ...theme.type.caption, color: theme.colors.inkMuted },
});
