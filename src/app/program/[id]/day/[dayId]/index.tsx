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
import type { DayExercise } from '@/features/programs/types';
import { useSession } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { startShortWorkoutFromDay, startWorkoutFromDay, useActiveWorkout } from '@/features/workouts/hooks';
import { shortVersionOf } from '@/features/workouts/short-version';
import { startWorkoutOrPrompt } from '@/features/workouts/start-guard';

// The bar is the app's (see `styles/header.ts`); only the fallback title
// is set here, for the states that have no day to name yet.
const SCREEN_OPTIONS = { title: 'Workout' } as const;

/** Splits the day's exercises into consecutive runs of main work and the
 * rest, in the day's own order. */
function groupMainWork(exercises: DayExercise[], mainIds: Set<string>): { main: boolean; exercises: DayExercise[] }[] {
  const runs: { main: boolean; exercises: DayExercise[] }[] = [];
  for (const exercise of exercises) {
    const main = mainIds.has(exercise.id);
    const last = runs[runs.length - 1];
    if (last != null && last.main === main) last.exercises.push(exercise);
    else runs.push({ main, exercises: [exercise] });
  }
  return runs;
}

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
  const short = day.kind === 'lifting' ? shortVersionOf(day) : null;
  // A day of only main work has nothing to set apart, so no box then.
  const mainIds = new Set(
    short != null && short.day.exercises.length < day.exercises.length ? short.day.exercises.map((e) => e.id) : [],
  );

  function handleStart() {
    startWorkoutOrPrompt(activeWorkout, () => {
      const workoutId = startWorkoutFromDay(day!, dayId, session.user.id);
      router.push(`/workout/${workoutId}`);
    });
  }

  function handleStartShort() {
    startWorkoutOrPrompt(activeWorkout, () => {
      const workoutId = startShortWorkoutFromDay(day!, dayId, session.user.id);
      if (workoutId) router.push(`/workout/${workoutId}`);
    });
  }

  return (
    <>
      {/* The day names the bar. `Stack.Title` rather than an options
          object: the composition components memoize, so a data-driven
          title doesn't re-configure the bar on every render. */}
      <Stack.Title>{day.name}</Stack.Title>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>{`${program.data.name} · ${week.name}`}</Text>

        {day.kind === 'lifting' && isActiveProgram && (
          <View style={styles.start}>
            <NativeButton variant="primary" label="Start workout" onPress={handleStart} />
            {/* The minimum viable workout: for a flat day, and it still
                counts for the week. */}
            {short != null && (
              <NativeButton
                variant="secondary"
                systemImage="timer"
                label={`Short on time? ${short.minutes}-min version`}
                onPress={handleStartShort}
              />
            )}
          </View>
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
          {/* Only your own copy of a programme is editable — a catalogue
              template is read-only, and RLS enforces that anyway. */}
          {isActiveProgram && (
            <NativeButton
              variant="ghost"
              size="small"
              fullWidth={false}
              systemImage="pencil"
              label="Edit workout"
              labelColor={theme.colors.accent}
              onPress={() => {
                haptics.tap();
                router.push(`/program/${id}/day/${dayId}/edit`);
              }}
            />
          )}
        </View>
        <View style={styles.exercises}>
          {/* The main work sits in a box: the exercises the short version
              keeps, i.e. what matters most today. Runs of them are boxed
              together, so a coach's pick from the middle of the day still
              reads as one thing where it can. */}
          {groupMainWork(day.exercises, mainIds).map((run) =>
            run.main ? (
              <View key={run.exercises[0].id} style={styles.mainBox}>
                <View style={styles.mainHeader}>
                  <SymbolView name="flame.fill" size={12} tintColor={theme.colors.ink} />
                  <Text style={styles.mainLabel}>Main work</Text>
                </View>
                {run.exercises.map((exercise) => (
                  <ExercisePlan key={exercise.id} exercise={exercise} />
                ))}
              </View>
            ) : (
              run.exercises.map((exercise) => <ExercisePlan key={exercise.id} exercise={exercise} />)
            ),
          )}
        </View>
      </ScrollView>
    </>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  subtitle: { ...theme.type.body, color: theme.colors.inkMuted },
  start: { gap: theme.spacing.sm },
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
  // Ink rather than the accent, so it reads as emphasis, not as something
  // to tap; inset so the box's edge doesn't crowd the set tables.
  mainBox: {
    gap: theme.spacing.xl,
    padding: theme.spacing.md,
    marginHorizontal: -theme.spacing.md,
    borderRadius: theme.radii.xl,
    borderWidth: 1.5,
    borderColor: theme.colors.activeRowBorder,
  },
  mainHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginBottom: -theme.spacing.sm },
  mainLabel: { ...theme.type.label, color: theme.colors.ink },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.canvas },
  emptyText: { ...theme.type.body, color: theme.colors.ink },
});
