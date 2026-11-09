import { StyleSheet, Text, View } from 'react-native';
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
import { exerciseKey, personalBests, workoutCard } from '@/features/stats/stats';
import { useMyLogbook } from '@/features/stats/hooks';
import { bestLabel, sessionDate, shortDuration, thousands } from '@/features/profile/format';
import type { DayKind } from '@/features/programs/types';
import { useSession } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { startEmptyWorkout, startShortWorkoutFromDay, startWorkoutFromDay, useActiveWorkout } from '@/features/workouts/hooks';
import { shortVersionOf } from '@/features/workouts/short-version';
import { startWorkoutOrPrompt } from '@/features/workouts/start-guard';
import { ShaderScrollView } from '@/features/backdrop/shader-scroll-view';

// The bar is the app's (see `styles/header.ts`); only the fallback title
// is set here, for the states that have no day to name yet.
const SCREEN_OPTIONS = { title: 'Workout' } as const;

const KIND_TITLE: Record<DayKind, string> = {
  lifting: 'Lifting session',
  court: 'Court session',
  rest: 'Rest day',
  comp: 'Competition day',
};

/** What a day with nothing to log is for, when the coach left no note. */
const KIND_BODY: Record<DayKind, string> = {
  lifting: '',
  court: 'Training or a game. It counts as training load, so the lifting around it is planned lighter.',
  rest: 'Nothing to log. A walk, a stretch, an early night: the next session is better for it.',
  comp: 'The day it was all for. Nothing in the gym; warm up well and go.',
};

/**
 * The workout preview: what a programme day asks for, before you commit to
 * it. Title and where it sits in the programme, one big Start, how this
 * workout has gone so far (times done, your bests in its exercises), then
 * the exercises with their set tables.
 *
 * `preview=1` (from the onboarding reveal) is a look and nothing more: no
 * start, no edit, no history. The programme is already theirs at that
 * point, so without it the page would offer all three.
 */
export default function DayScreen() {
  const { id, dayId, preview } = useLocalSearchParams<{ id: string; dayId: string; preview?: string }>();
  const readOnly = preview === '1';
  const program = useProgram(id);
  const active = useActiveProgram();
  const session = useSession();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const activeWorkout = useActiveWorkout();
  const book = useMyLogbook();

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

  const isActiveProgram = active.data?.programId === id && !readOnly;
  const stats = day.kind === 'lifting' && !readOnly ? dayStats(book, program.data.weeks, day) : null;
  // The live workout, when it's this very day.
  const resumable = activeWorkout != null && activeWorkout.program_day_id === dayId ? activeWorkout : null;
  const short = day.kind === 'lifting' ? shortVersionOf(day) : null;

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
      <ShaderScrollView
        vibe="programme"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>{`${program.data.name} · ${week.name}`}</Text>

        {/* A day with nothing to log says what it's for, and still lets
            you train if you want to: an unplanned session counts too. */}
        {day.kind !== 'lifting' && (
          <Card style={styles.kindCard}>
            <Text style={styles.kindTitle}>{KIND_TITLE[day.kind]}</Text>
            <Text style={styles.kindBody}>{day.notes ?? KIND_BODY[day.kind]}</Text>
            {isActiveProgram && day.kind !== 'comp' && (
              <NativeButton
                variant="secondary"
                systemImage="plus"
                label="Start an empty workout anyway"
                onPress={() =>
                  startWorkoutOrPrompt(activeWorkout, () => {
                    const workoutId = startEmptyWorkout(session.user.id);
                    router.push(`/workout/${workoutId}`);
                  })
                }
              />
            )}
          </Card>
        )}

        {day.kind === 'lifting' && isActiveProgram && (
          <View style={styles.start}>
            {/* This day is already running: the only thing to do is get
                back into it. Starting again is what the live pill's
                trash is for. */}
            {resumable != null ? (
              <NativeButton
                variant="primary"
                systemImage="play.fill"
                label="Resume workout"
                onPress={() => {
                  haptics.tap();
                  router.push(`/workout/${resumable.id}`);
                }}
              />
            ) : (
              <NativeButton variant="primary" label="Start workout" onPress={handleStart} />
            )}
            {/* The minimum viable workout: for a flat day, and it still
                counts for the week. */}
            {short != null && resumable == null && (
              <NativeButton
                variant="secondary"
                systemImage="timer"
                label={`Short on time? ${short.minutes}-min version`}
                onPress={handleStartShort}
              />
            )}
          </View>
        )}

        {day.kind === 'lifting' && (
          <>
        {/* How this workout has gone: sessions done from this day (any
            week of the programme), and your best in each of its exercises,
            each a tap from its history. */}
        {stats != null && (
          <Card style={styles.statsCard}>
            {stats.sessions === 0 ? (
              <View style={styles.statsEmpty}>
                <SymbolView name="chart.bar.xaxis" size={32} tintColor={theme.colors.inkMuted} />
                <Text style={styles.statsTitle}>Not done yet</Text>
                <Text style={styles.statsBody}>Your bests in these exercises show here after the first session.</Text>
              </View>
            ) : (
              <View style={styles.statsRow}>
                <Stat value={String(stats.sessions)} label={stats.sessions === 1 ? 'time done' : 'times done'} />
                <Stat value={stats.last != null ? sessionDate(stats.last.workout.started_at, new Date()) : '—'} label="last" />
                <Stat value={stats.last != null ? shortDuration(stats.last.durationSeconds) : '—'} label="took" />
                {stats.last != null && stats.last.volumeKg > 0 && (
                  <Stat value={`${thousands(stats.last.volumeKg)} kg`} label="lifted" />
                )}
              </View>
            )}
            {stats.bests.length > 0 && (
              <View style={styles.bests}>
                {stats.bests.map((b) => (
                  <NativeButton
                    key={b.key}
                    variant="ghost"
                    size="small"
                    fullWidth={false}
                    label={`${b.name} · ${bestLabel(b)}`}
                    labelColor={theme.colors.ink}
                    onPress={() => {
                      haptics.tap();
                      router.push({ pathname: '/stats/[key]', params: { key: b.key } });
                    }}
                  />
                ))}
              </View>
            )}
          </Card>
        )}

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
          {day.exercises.map((exercise) => (
            <ExercisePlan key={exercise.id} exercise={exercise} />
          ))}
        </View>
          </>
        )}
      </ShaderScrollView>
    </>
  );
}

/** What a day's stats card shows: sessions logged from this day in any
 * week of the programme (matched by name, since each week's copy has its
 * own id), the latest of them, and the bests in its exercises. */
function dayStats(book: ReturnType<typeof useMyLogbook>, weeks: { days: { id: string; name: string }[] }[], day: { name: string; exercises: { exerciseName: string }[] }) {
  const dayIds = new Set(weeks.flatMap((w) => w.days.filter((d) => d.name === day.name).map((d) => d.id)));
  const done = book.workouts.filter((w) => w.program_day_id != null && dayIds.has(w.program_day_id));
  const last = done[0] != null ? workoutCard(book, done[0]) : null;
  const bests = personalBests(book);
  const wanted = new Set(day.exercises.map((e) => exerciseKey(e.exerciseName)));
  return { sessions: done.length, last, bests: bests.filter((b) => wanted.has(b.key)) };
}

function Stat({ value, label }: { value: string; label: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  subtitle: { ...theme.type.body, color: theme.colors.inkMuted },
  start: { gap: theme.spacing.sm },
  statsCard: { gap: theme.spacing.md },
  statsEmpty: { alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.md },
  statsTitle: { ...theme.type.heading, color: theme.colors.inkMuted },
  statsBody: { ...theme.type.caption, color: theme.colors.inkMuted, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: theme.spacing.sm },
  stat: { flex: 1, gap: 2 },
  statValue: { ...theme.type.heading, color: theme.colors.ink },
  statLabel: { ...theme.type.caption, color: theme.colors.inkMuted },
  bests: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  exercisesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // The ghost button's host is taller than the label; pull the row in so
    // the eyebrow doesn't float above the exercises.
    marginBottom: -theme.spacing.sm,
  },
  exercises: { gap: theme.spacing.xl },
  kindCard: { gap: theme.spacing.sm },
  kindTitle: { ...theme.type.heading, color: theme.colors.ink },
  kindBody: { ...theme.type.body, color: theme.colors.inkMuted },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.canvas },
  emptyText: { ...theme.type.body, color: theme.colors.ink },
});
