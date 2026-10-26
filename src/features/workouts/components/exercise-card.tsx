import { useRef } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Card } from '@/components/ui/card';
import { NativeButton } from '@/components/ui/native-button';
import { IconCircle } from '@/components/ui/icon-circle';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { addSet, completeAllSets, updateExerciseNotes, type WorkoutExerciseWithSets } from '../hooks';
import { openExerciseMenu, openRestTimerSheet } from './exercise-menu';
import { logTypeOf } from '../log-type';
import { SET_TABLE_COLUMNS, SetRow } from './set-row';

function formatRestTimer(restSeconds: number | null): string {
  if (restSeconds == null) return 'OFF';
  const min = Math.floor(restSeconds / 60);
  const sec = restSeconds % 60;
  return sec > 0 ? `${min}min ${sec}s` : `${min}min`;
}

export function ExerciseCard({
  exercise,
  workoutId,
  canMoveUp,
  canMoveDown,
}: {
  exercise: WorkoutExerciseWithSets;
  workoutId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const logType = logTypeOf(exercise);
  const doneCount = exercise.sets.filter((s) => s.completed_at != null).length;
  const allDone = exercise.sets.length > 0 && doneCount === exercise.sets.length;
  const notesRef = useRef<TextInput>(null);
  // What the programme asked for — "4 × 2 @ 85%", or whatever its LOAD
  // column said ("RPE 7", "moderate"). That's the thing you're deciding
  // against when you pick a weight, so it reads at a glance above the
  // table rather than sitting behind a tap. Sets added by hand carry no
  // target, hence the search for the first that has one.
  const prescription = exercise.sets.find((s) => s.target != null)?.target ?? null;

  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.name}>{exercise.exercise_name}</Text>
        <IconCircle
          name="ellipsis"
          fallback="⋯"
          size={28}
          onPress={() =>
            openExerciseMenu({
              workoutId,
              exercise,
              canMoveUp,
              canMoveDown,
              logType,
              onAddNote: () => notesRef.current?.focus(),
            })
          }
        />
      </View>

      {/* At-a-glance metrics, same language as the Today week cards: icon +
          number, with rest as a tappable chip rather than a prose line. */}
      <View style={styles.metrics}>
        {prescription != null && (
          <View style={styles.metric}>
            <SymbolView name="target" size={12} tintColor={theme.colors.accent} />
            <Text style={[styles.metricText, styles.prescription]}>{prescription}</Text>
          </View>
        )}
        <View style={styles.metric}>
          <SymbolView name="square.stack.3d.up.fill" size={12} tintColor={theme.colors.inkMuted} />
          <Text style={styles.metricText}>{`${doneCount}/${exercise.sets.length} sets`}</Text>
        </View>
        <Pressable style={styles.metric} onPress={() => openRestTimerSheet(exercise.id)} hitSlop={6}>
          <SymbolView name="timer" size={12} tintColor={theme.colors.inkMuted} />
          <Text style={styles.metricText}>{formatRestTimer(exercise.rest_seconds)}</Text>
        </Pressable>
      </View>

      <TextInput
        ref={notesRef}
        style={styles.notes}
        placeholder="Add notes here…"
        placeholderTextColor={theme.colors.inkMuted}
        value={exercise.notes ?? ''}
        onChangeText={(text) => updateExerciseNotes(exercise.id, text)}
        multiline
      />

      <View style={styles.header}>
        <Text style={[styles.headerLabel, { width: SET_TABLE_COLUMNS.set, textAlign: 'center' }]}>SET</Text>
        <Text style={[styles.headerLabel, styles.headerPrevious]}>PREVIOUS</Text>
        {logType !== 'weight_reps' ? (
          <Text style={[styles.headerLabel, { width: SET_TABLE_COLUMNS.cell * 2, textAlign: 'center' }]}>
            {logType === 'duration' ? 'TIME' : 'REPS'}
          </Text>
        ) : (
          <>
            <Text style={[styles.headerLabel, { width: SET_TABLE_COLUMNS.cell, textAlign: 'center' }]}>KG</Text>
            <Text style={[styles.headerLabel, { width: SET_TABLE_COLUMNS.cell, textAlign: 'center' }]}>REPS</Text>
          </>
        )}
        {/* Complete all: the sets tick themselves off top to bottom. */}
        <Pressable
          style={[styles.headerCheck, { width: SET_TABLE_COLUMNS.check }]}
          onPress={() => {
            Keyboard.dismiss();
            completeAllSets(exercise.id);
          }}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={allDone ? 'Untick all sets' : 'Complete all sets'}
        >
          <SymbolView
            name={allDone ? 'checkmark.circle.fill' : 'checkmark'}
            size={allDone ? 16 : 13}
            weight="bold"
            tintColor={allDone ? theme.colors.done : theme.colors.inkMuted}
          />
        </Pressable>
      </View>

      {exercise.sets.map((set) => (
        <SetRow
          key={set.id}
          set={set}
          siblingSets={exercise.sets}
          exerciseId={exercise.exercise_id}
          exerciseName={exercise.exercise_name}
          workoutId={workoutId}
          logType={logType}
        />
      ))}

      <NativeButton label="Add Set" systemImage="plus" variant="tonal" onPress={() => addSet(exercise.id)} />
    </Card>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  card: { gap: theme.spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  name: { ...theme.type.heading, color: theme.colors.accent, flex: 1 },
  notes: { ...theme.type.body, color: theme.colors.ink, paddingVertical: theme.spacing.xs },
  metrics: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.md },
  metric: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  metricText: { ...theme.type.caption, color: theme.colors.inkMuted, fontVariant: ['tabular-nums'] },
  // The one metric that's an instruction rather than a reading, so it
  // carries the accent the exercise name does.
  prescription: { color: theme.colors.accent },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.xs },
  headerLabel: { ...theme.type.label, color: theme.colors.inkMuted },
  headerPrevious: { flex: 1 },
  headerCheck: { alignItems: 'center', justifyContent: 'center', height: 20 },
});
