import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { Card } from '@/components/ui/card';
import { NativeButton } from '@/components/ui/native-button';
import { SectionLabel } from '@/components/ui/section-label';
import { ExercisePlan } from '@/features/programs/components/exercise-plan';
import { Markdown } from '@/features/programs/components/markdown';
import { QueryFallback } from '@/features/programs/components/query-fallback';
import { useActiveProgram, useProgram } from '@/features/programs/hooks';
import { useSession } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { startWorkoutFromDay, useActiveWorkout } from '@/features/workouts/hooks';
import { startWorkoutOrPrompt } from '@/features/workouts/start-guard';

// Module-level so the identity is stable: an inline `options` literal would
// re-run setOptions on every render and reset the native header mid-scroll.
// A bare chevron, no previous-screen title: the bar stays "Workout" and
// nothing else, like the Programme tab's.
const SCREEN_OPTIONS = { headerShown: true, title: 'Workout', headerBackButtonDisplayMode: 'minimal' } as const;

/**
 * The workout preview: what a programme day asks for, before you commit to
 * it. Title and where it sits in the programme, one big Start, a stats
 * card (a placeholder until there's history to chart), then the exercises
 * with their set tables.
 */
export default function DayScreen() {
  const { id, dayId } = useLocalSearchParams<{ id: string; dayId: string }>();
  const program = useProgram(id);
  const active = useActiveProgram();
  const session = useSession();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const activeWorkout = useActiveWorkout();

  if (program.isPending || program.isError) {
    return (
      <>
        <Stack.Screen options={SCREEN_OPTIONS} />
        <QueryFallback
          isError={program.isError}
          message="Couldn't load this workout."
          onRetry={() => program.refetch()}
        />
      </>
    );
  }

  const week = program.data.weeks.find((w) => w.days.some((d) => d.id === dayId));
  const day = week?.days.find((d) => d.id === dayId);
  if (!week || !day) {
    return (
      <>
        <Stack.Screen options={SCREEN_OPTIONS} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Workout not found.</Text>
        </View>
      </>
    );
  }

  const isActiveProgram = active.data?.programId === id;

  function handleStart() {
    startWorkoutOrPrompt(activeWorkout, () => {
      const workoutId = startWorkoutFromDay(day!, dayId, session.user.id);
      router.push(`/workout/${workoutId}`);
    });
  }

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      {/* Transparent bar, same as the Programme tab: iOS draws its soft
          scroll-edge effect as content passes under. That needs the
          ScrollView to be the screen's first subview, hence no wrapper. */}
      <Stack.Header transparent style={{ color: theme.colors.ink, shadowColor: 'transparent' }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{day.name}</Text>
          <Text style={styles.subtitle}>{`${program.data.name} · ${week.name}`}</Text>
        </View>

        {day.kind === 'lifting' && isActiveProgram && (
          <NativeButton variant="primary" label="Start workout" onPress={handleStart} />
        )}

        {/* Placeholder for the session's history (volume, reps, duration
            over time) until there's a chart to put here. */}
        <Card style={styles.statsCard}>
          <SymbolView name="chart.bar.xaxis" size={40} tintColor={theme.colors.inkMuted} />
          <Text style={styles.statsTitle}>Stats coming soon</Text>
          <Text style={styles.statsBody}>Volume, reps and duration for this workout over time.</Text>
        </Card>

        {day.notes != null && <Markdown>{day.notes}</Markdown>}

        <View style={styles.exercisesHeader}>
          <SectionLabel>Exercises</SectionLabel>
          {/* Editing a programme day isn't built yet; the button marks where
              it will live. */}
          <NativeButton
            variant="ghost"
            size="small"
            fullWidth={false}
            systemImage="pencil"
            label="Edit workout"
            labelColor={theme.colors.accent}
            onPress={() => haptics.tap()}
          />
        </View>
        <View style={styles.exercises}>
          {day.exercises.map((exercise) => (
            <ExercisePlan key={exercise.id} exercise={exercise} />
          ))}
        </View>
      </ScrollView>
    </>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  titleBlock: { gap: theme.spacing.xs },
  title: { ...theme.type.display, color: theme.colors.ink },
  subtitle: { ...theme.type.body, color: theme.colors.inkMuted },
  statsCard: { alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.xxl },
  statsTitle: { ...theme.type.heading, color: theme.colors.inkMuted },
  statsBody: { ...theme.type.caption, color: theme.colors.inkMuted, textAlign: 'center' },
  exercisesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // The ghost button's host is taller than the label; pull the row in so
    // the eyebrow doesn't float above the exercises.
    marginBottom: -theme.spacing.sm,
  },
  exercises: { gap: theme.spacing.xl },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.canvas },
  emptyText: { ...theme.type.body, color: theme.colors.ink },
});
