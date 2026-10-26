import { StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Card } from '@/components/ui/card';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { sessionDate, shortDuration, thousands } from '@/features/profile/format';
import { usePersonLogbook } from '@/features/stats/hooks';
import { workoutCard } from '@/features/stats/stats';
import type { WorkoutSet } from '@/features/workouts/types';
import { ShaderScrollView } from '@/features/backdrop/shader-scroll-view';

function setText(s: WorkoutSet): string {
  if (s.duration_seconds != null && s.weight_kg == null) return `${s.duration_seconds} s`;
  if (s.weight_kg != null && s.reps != null) return `${Math.round(s.weight_kg * 10) / 10} kg × ${s.reps}`;
  if (s.weight_kg != null) return `${Math.round(s.weight_kg * 10) / 10} kg`;
  return s.reps != null ? `${s.reps} reps` : '—';
}

/** A crewmate's session, read-only: what they did, set by set. Reads the
 * profile's already-fetched logbook, so it opens instantly. */
export default function PersonWorkoutScreen() {
  const { id, workoutId } = useLocalSearchParams<{ id: string; workoutId: string }>();
  const styles = useThemedStyles(createStyles);
  const log = usePersonLogbook(id);
  const workout = log.data?.workouts.find((w) => w.id === workoutId);

  if (!log.data || !workout) {
    return (
      <View style={styles.scroll}>
        <Text style={styles.empty}>{log.isPending ? ' ' : 'Session not found.'}</Text>
      </View>
    );
  }

  const book = log.data;
  const card = workoutCard(book, workout);
  const exercises = (book.exercisesByWorkout.get(workout.id) ?? [])
    .map((e) => ({ exercise: e, sets: book.setsByExercise.get(e.id) ?? [] }))
    .filter((e) => e.sets.length > 0);

  return (
    <>
      <Stack.Title>{workout.title}</Stack.Title>
      <ShaderScrollView
        vibe="crew"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text style={styles.date}>{sessionDate(workout.started_at, new Date())}</Text>
        <View style={styles.stats}>
          <Stat label="Time" value={shortDuration(card.durationSeconds)} />
          {card.volumeKg > 0 && <Stat label="Volume" value={`${thousands(card.volumeKg)} kg`} />}
          {card.records > 0 && <Stat label="Records" value={`🏅 ${card.records}`} />}
        </View>
        {workout.notes != null && <Text style={styles.notes}>{workout.notes}</Text>}

        {exercises.map(({ exercise, sets }) => (
          <Card key={exercise.id} style={styles.card} glass={false}>
            <Text style={styles.name}>{exercise.exercise_name}</Text>
            {sets.map((s, i) => (
              <View key={s.id} style={styles.setRow}>
                <Text style={styles.setNumber}>{s.set_type === 'warmup' ? 'W' : String(i + 1)}</Text>
                <Text style={styles.setText}>{setText(s)}</Text>
              </View>
            ))}
          </Card>
        ))}
      </ShaderScrollView>
    </>
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
  scroll: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  empty: { ...theme.type.body, color: theme.colors.inkMuted, textAlign: 'center', paddingTop: 120 },
  date: { ...theme.type.caption, color: theme.colors.inkMuted },
  stats: { flexDirection: 'row', gap: theme.spacing.xl, marginBottom: theme.spacing.sm },
  stat: { gap: 2 },
  statLabel: { ...theme.type.caption, color: theme.colors.inkMuted },
  statValue: { ...theme.type.heading, color: theme.colors.ink, fontVariant: ['tabular-nums'] },
  notes: { ...theme.type.body, color: theme.colors.ink },
  card: { gap: theme.spacing.xs },
  name: { ...theme.type.heading, color: theme.colors.accent, marginBottom: theme.spacing.xs },
  setRow: { flexDirection: 'row', gap: theme.spacing.md },
  setNumber: { ...theme.type.body, color: theme.colors.inkMuted, width: 20, fontVariant: ['tabular-nums'] },
  setText: { ...theme.type.body, color: theme.colors.ink, fontVariant: ['tabular-nums'] },
});
