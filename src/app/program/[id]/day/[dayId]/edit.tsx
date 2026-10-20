import { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Card } from '@/components/ui/card';
import { NativeButton } from '@/components/ui/native-button';
import { SwipeToDelete } from '@/components/ui/swipe-to-delete';
import { HeaderPrimaryButton } from '@/features/workouts/components/header-buttons';
import { ExercisePicker } from '@/features/workouts/components/exercise-picker';
import { QueryFallback } from '@/features/programs/components/query-fallback';
import { useProgram, useSaveDayExercises } from '@/features/programs/hooks';
import type { DayExerciseDraft } from '@/features/programs/api';
import type { DayExercise } from '@/features/programs/types';
import type { Exercise } from '@/features/workouts/types';
import { haptics } from '@/lib/haptics';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

const SCREEN_OPTIONS = { presentation: 'modal', title: 'Edit workout' } as const;

function toDraft(exercise: DayExercise): DayExerciseDraft {
  return {
    id: exercise.id,
    exerciseName: exercise.exerciseName,
    exerciseId: exercise.exerciseId,
    sets: exercise.sets,
    reps: exercise.reps,
    load: exercise.load,
    notes: exercise.notes,
  };
}

/**
 * Editing a programme day: what the plan asks of you, changed to what you
 * actually want it to ask.
 *
 * The edit lands on your own copy of the programme (every user gets an
 * instance when they select a template), so it sticks for this day from
 * here on — it isn't a one-session tweak. Changing just today's session is
 * what the workout screen's own add/replace/delete are for.
 *
 * Everything is held locally until Save, so a half-finished edit costs
 * nothing and backing out really does back out.
 */
export default function EditDayScreen() {
  const { id, dayId } = useLocalSearchParams<{ id: string; dayId: string }>();
  const program = useProgram(id);
  const save = useSaveDayExercises(id);
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const day = program.data?.weeks.flatMap((w) => w.days).find((d) => d.id === dayId) ?? null;

  // Seeded once from the loaded day: after that the list is the user's,
  // and a background refetch mustn't overwrite what they're typing.
  const [drafts, setDrafts] = useState<DayExerciseDraft[] | null>(null);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);

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

  if (!day) {
    return (
      <>
        <Stack.Screen options={SCREEN_OPTIONS} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Workout not found.</Text>
        </View>
      </>
    );
  }

  const list = drafts ?? day.exercises.map(toDraft);

  function update(index: number, patch: Partial<DayExerciseDraft>) {
    setDrafts(list.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)));
  }

  function remove(index: number) {
    const [gone] = list.slice(index, index + 1);
    haptics.warning();
    if (gone.id != null) setRemovedIds([...removedIds, gone.id]);
    setDrafts(list.filter((_, i) => i !== index));
  }

  function add(exercise: Exercise) {
    setPicking(false);
    haptics.tap();
    setDrafts([
      ...list,
      {
        id: null,
        exerciseName: exercise.name,
        exerciseId: exercise.id,
        // A fresh row starts on the commonest prescription rather than
        // blank, so adding one is a tap and not a form.
        sets: 3,
        reps: '8',
        load: null,
        notes: null,
      },
    ]);
  }

  function handleSave() {
    haptics.commit();
    save.mutate(
      { dayId, drafts: list, removedIds },
      {
        onSuccess: () => router.back(),
        onError: (e: Error) => Alert.alert("Couldn't save", e.message),
      },
    );
  }

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View hidesSharedBackground>
          <HeaderPrimaryButton label={save.isPending ? 'Saving…' : 'Save'} onPress={handleSave} />
        </Stack.Toolbar.View>
      </Stack.Toolbar>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lede}>
          Changes stick to your copy of {program.data.name} — this day, every time it comes round.
        </Text>

        {list.map((draft, index) => (
          <SwipeToDelete key={draft.id ?? `new-${index}`} onDelete={() => remove(index)}>
            <Card style={styles.card}>
              <Text style={styles.name}>{draft.exerciseName}</Text>

              <View style={styles.fields}>
                <Field
                  label="SETS"
                  value={draft.sets != null ? String(draft.sets) : ''}
                  placeholder="—"
                  keyboardType="number-pad"
                  onChangeText={(text) => {
                    const n = Number(text.replace(/[^0-9]/g, ''));
                    update(index, { sets: n > 0 ? n : null });
                  }}
                />
                <Field
                  label="REPS"
                  value={draft.reps ?? ''}
                  placeholder="8–10"
                  onChangeText={(text) => update(index, { reps: text.length > 0 ? text : null })}
                />
                <Field
                  label="LOAD"
                  value={draft.load ?? ''}
                  placeholder="85% / RPE 7"
                  onChangeText={(text) => update(index, { load: text.length > 0 ? text : null })}
                />
              </View>

              <TextInput
                style={styles.notes}
                placeholder="Coaching note…"
                placeholderTextColor={theme.colors.inkMuted}
                value={draft.notes ?? ''}
                onChangeText={(text) => update(index, { notes: text.length > 0 ? text : null })}
                multiline
              />
            </Card>
          </SwipeToDelete>
        ))}

        <NativeButton
          label="Add exercise"
          systemImage="plus"
          variant="tonal"
          onPress={() => {
            haptics.tap();
            setPicking(true);
          }}
        />
        <Text style={styles.hint}>Swipe a card left to remove it.</Text>
      </ScrollView>

      {/* A sheet rather than another route: the picker needs to hand an
          exercise straight back to the list being edited, and a route
          would have to carry that list through navigation to do it. */}
      <Modal visible={picking} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.sheet}>
          <View style={styles.sheetBar}>
            <Text style={styles.sheetTitle}>Add exercise</Text>
            <NativeButton
              label="Cancel"
              fullWidth={false}
              size="small"
              onPress={() => setPicking(false)}
            />
          </View>
          <ExercisePicker onPick={add} />
        </View>
      </Modal>
    </>
  );
}

function Field({
  label,
  value,
  placeholder,
  keyboardType,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  keyboardType?: 'number-pad';
  onChangeText: (text: string) => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.inkMuted}
        keyboardType={keyboardType}
        autoCapitalize="none"
        onChangeText={onChangeText}
      />
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  lede: { ...theme.type.caption, color: theme.colors.inkMuted },
  card: { gap: theme.spacing.sm },
  name: { ...theme.type.heading, color: theme.colors.accent },
  fields: { flexDirection: 'row', gap: theme.spacing.sm },
  field: { flex: 1, gap: theme.spacing.xs },
  fieldLabel: { ...theme.type.label, fontSize: 9, color: theme.colors.inkMuted },
  input: {
    ...theme.type.body,
    color: theme.colors.ink,
    backgroundColor: theme.colors.glassSolid,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  notes: { ...theme.type.caption, color: theme.colors.inkMuted, paddingVertical: theme.spacing.xs },
  hint: { ...theme.type.caption, color: theme.colors.inkMuted, textAlign: 'center' },
  sheet: { flex: 1, backgroundColor: theme.colors.canvas },
  sheetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  sheetTitle: { ...theme.type.title, color: theme.colors.ink },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.canvas },
  emptyText: { ...theme.type.body, color: theme.colors.ink },
});
