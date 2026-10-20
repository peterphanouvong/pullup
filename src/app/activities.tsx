import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { NumeralRow } from '@/components/ui/numeral-row';
import { SwipeToDelete } from '@/components/ui/swipe-to-delete';
import { discardWorkout, useFinishedWorkouts } from '@/features/workouts/hooks';
import { activityDateLabel, activityMetaLabel } from '@/features/workouts/selectors';

// Finished-workout history, newest first (as NumeralRows), fed by the
// workout store's `useFinishedWorkouts`. Empty state preserved for a
// brand-new account with no finished sessions yet.
function confirmDelete(workoutId: string, title: string): void {
  Alert.alert('Delete workout?', `"${title}" and everything logged in it will be removed.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => discardWorkout(workoutId) },
  ]);
}

export default function ActivitiesScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const items = useFinishedWorkouts();

  // No wrapper view: the bar is transparent, and UIKit only finds the
  // ScrollView to draw its scroll-edge effect over when that view is the
  // screen's first subview.
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
    >
      {items.length === 0 ? (
        <View style={styles.empty}>
          <SymbolView
            name="clock.arrow.circlepath"
            size={40}
            tintColor={theme.colors.inkMuted}
            fallback={<Text style={styles.emptyIconFallback}>⏱</Text>}
          />
          <Text style={styles.emptyText}>No workouts yet — your first session will show up here.</Text>
        </View>
      ) : (
        <View>
          {items.map(({ workout, summary }) => {
            const { day, month } = activityDateLabel(workout.finished_at as string);
            return (
              <SwipeToDelete key={workout.id} onDelete={() => confirmDelete(workout.id, workout.title)}>
                <NumeralRow
                  numeral={day}
                  caption={month}
                  title={workout.title}
                  subtitle={activityMetaLabel(summary.durationSeconds, summary.volumeKg, summary.completedCount)}
                  onPress={() => router.push(`/workout/${workout.id}/summary`)}
                />
              </SwipeToDelete>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xl, flexGrow: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    paddingTop: theme.spacing.xxl,
  },
  emptyIconFallback: { fontSize: 32, color: theme.colors.inkMuted },
  emptyText: {
    ...theme.type.body,
    color: theme.colors.inkMuted,
    textAlign: 'center',
    maxWidth: 260,
  },
});
