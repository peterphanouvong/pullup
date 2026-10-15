import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { DatePicker, Host } from '@expo/ui/swift-ui';
import { NativeButton } from '@/components/ui/native-button';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import {
  HEADER_CHEVRON_SIZE,
  HeaderIconButton,
  HeaderPrimaryButton,
} from '@/features/workouts/components/header-buttons';
import { discardWorkout, saveWorkout, useWorkout } from '@/features/workouts/hooks';
import {
  completedSetCount,
  elapsedSeconds,
  formatWorkoutDuration,
  workoutVolumeKg,
} from '@/features/workouts/selectors';

// Module-level so its identity is stable (see the workout screen): the
// native back button is replaced by our own chevron in the toolbar.
const SCREEN_OPTIONS = { headerBackVisible: false } as const;

/**
 * The step between Finish and the summary, Hevy-style: name the session,
 * leave a note on how it went, fix the date if you're logging it late, then
 * Save. Discard lives here too, at the bottom, which is why the workout
 * header no longer carries a bin.
 *
 * Pushed inside the workout modal, so back returns to logging. Saving pops
 * this screen and replaces the workout with the summary, which keeps the
 * finished workout off the back stack exactly as before.
 */
export default function SaveWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workout, exercises } = useWorkout(id);
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const [title, setTitle] = useState(workout?.title ?? '');
  const [notes, setNotes] = useState(workout?.notes ?? '');
  const [startedAt, setStartedAt] = useState(() => (workout ? new Date(workout.started_at) : new Date()));

  // Real state for the clock (see the React Compiler note in the guide).
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!workout) return null;

  const allSets = exercises.flatMap((e) => e.sets);

  function handleSave() {
    saveWorkout(id, { title, notes, startedAt }, new Date());
    router.dismiss();
    router.replace(`/workout/${id}/summary`);
  }

  function handleDiscard() {
    Alert.alert(
      'Discard workout?',
      "This removes the workout and everything logged in it. This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            discardWorkout(id);
            router.replace('/');
          },
        },
      ],
    );
  }

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <Stack.Title>Save Workout</Stack.Title>
      {/* Transparent like the Programme tab: iOS draws the scroll-edge
          effect over the ScrollView below. */}
      <Stack.Header transparent style={{ color: theme.colors.ink, shadowColor: 'transparent' }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.View hidesSharedBackground>
          <HeaderIconButton
            icon="chevron.left"
            iconSize={HEADER_CHEVRON_SIZE}
            size="large"
            accessibilityLabel="Back to workout"
            onPress={() => router.back()}
          />
        </Stack.Toolbar.View>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View hidesSharedBackground>
          <HeaderPrimaryButton label="Save" onPress={handleSave} />
        </Stack.Toolbar.View>
      </Stack.Toolbar>

      {/* First child, background on the scroll view itself: the native
          header finds its scroll view by walking subviews[0]. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          style={styles.title}
          value={title}
          onChangeText={setTitle}
          placeholder="Workout name"
          placeholderTextColor={theme.colors.inkMuted}
          clearButtonMode="while-editing"
          returnKeyType="done"
        />

        <View style={styles.stats}>
          <Stat label="DURATION" value={formatWorkoutDuration(elapsedSeconds(workout, now))} />
          <Stat label="VOLUME" value={`${Math.round(workoutVolumeKg(allSets))} kg`} />
          <Stat label="SETS" value={String(completedSetCount(allSets))} />
        </View>

        <View style={styles.divider} />

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>DESCRIPTION</Text>
          <TextInput
            style={styles.notes}
            value={notes}
            onChangeText={setNotes}
            placeholder="How did it go? Leave some notes here…"
            placeholderTextColor={theme.colors.inkMuted}
            multiline
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <SymbolView name="calendar" size={20} tintColor={theme.colors.ink} />
          <Text style={styles.rowLabel}>Date</Text>
          {/* Native compact picker: date and time chips that open the
              system calendar. Capped at now — you can't log the future. */}
          <Host matchContents seedColor={theme.colors.accent}>
            <DatePicker
              selection={startedAt}
              range={{ end: now }}
              displayedComponents={['date', 'hourAndMinute']}
              onDateChange={setStartedAt}
            />
          </Host>
        </View>

        <View style={styles.divider} />

        <NativeButton
          label="Discard Workout"
          variant="ghost"
          labelColor={theme.colors.danger}
          onPress={handleDiscard}
        />
      </ScrollView>
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
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg },
  title: { ...theme.type.title, color: theme.colors.ink, paddingVertical: theme.spacing.xs },
  stats: { flexDirection: 'row' },
  stat: { flex: 1, gap: 2 },
  statLabel: { ...theme.type.label, fontSize: 9, color: theme.colors.inkMuted },
  statValue: { ...theme.type.heading, color: theme.colors.ink, fontVariant: ['tabular-nums'] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
  field: { gap: theme.spacing.xs },
  fieldLabel: { ...theme.type.label, fontSize: 9, color: theme.colors.inkMuted },
  notes: { ...theme.type.body, color: theme.colors.ink, minHeight: 72, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: 44 },
  rowLabel: { ...theme.type.body, color: theme.colors.ink, flex: 1 },
});
