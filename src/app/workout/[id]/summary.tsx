import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { GradientCard } from '@/components/ui/gradient-card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { useWorkout } from '@/features/workouts/hooks';
import { formatWorkoutDuration, workoutSummary } from '@/features/workouts/selectors';

function formatBestSet(bestSet: { weight_kg: number | null; reps: number | null; duration_seconds: number | null } | null): string {
  if (!bestSet) return '—';
  if (bestSet.weight_kg != null && bestSet.reps != null) return `${bestSet.weight_kg} kg × ${bestSet.reps}`;
  if (bestSet.duration_seconds != null) return `${bestSet.duration_seconds}s`;
  if (bestSet.reps != null) return `${bestSet.reps} reps`;
  return '—';
}

/** Finish summary (Flighty-passport-style recap per the design-v2 spec):
 * big tabular numerals for duration/volume/sets over `gradientRecap`, a
 * per-exercise best-set list below, Done → Today. Reached via
 * `router.replace` from the workout screen (never pushed), and its own Done
 * button also `replace`s — so the finished workout screen never sits behind
 * this one on the back stack. */
export default function WorkoutSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workout, exercises } = useWorkout(id);
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  if (!workout) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.notFound}>Workout not found.</Text>
      </Screen>
    );
  }

  const allSets = exercises.flatMap((e) => e.sets);
  const summary = workoutSummary(workout, exercises, allSets);

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{workout.title}</Text>

        <GradientCard colors={theme.colors.gradientRecap}>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumeral}>{formatWorkoutDuration(summary.durationSeconds)}</Text>
              <Text style={styles.statLabel}>DURATION</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumeral}>{Math.round(summary.volumeKg)}</Text>
              <Text style={styles.statLabel}>VOLUME KG</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumeral}>{summary.completedCount}</Text>
              <Text style={styles.statLabel}>SETS</Text>
            </View>
          </View>
        </GradientCard>

        {summary.perExercise.length > 0 && (
          <View style={styles.list}>
            <SectionLabel>BEST SETS</SectionLabel>
            {summary.perExercise.map((item) => (
              <View key={item.exerciseName} style={styles.row}>
                <Text style={styles.exerciseName} numberOfLines={1}>
                  {item.exerciseName}
                </Text>
                <Text style={styles.bestSet}>{formatBestSet(item.bestSet)}</Text>
              </View>
            ))}
          </View>
        )}

        <PrimaryButton title="Done" onPress={() => router.replace('/')} />
      </ScrollView>
    </Screen>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  notFound: { ...theme.type.body, color: theme.colors.ink, padding: theme.spacing.lg },
  title: { ...theme.type.display, color: theme.colors.ink },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', gap: theme.spacing.xs, flex: 1 },
  statNumeral: { ...theme.type.numeralXL, color: theme.colors.onGradient },
  statLabel: { ...theme.type.label, color: theme.colors.onGradient },
  list: { gap: theme.spacing.xs },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  exerciseName: { ...theme.type.body, color: theme.colors.ink, flex: 1, marginRight: theme.spacing.sm },
  bestSet: { ...theme.type.body, color: theme.colors.inkMuted, fontVariant: ['tabular-nums'] },
});
