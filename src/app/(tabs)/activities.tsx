import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { Screen } from '@/components/ui/screen';
import { ScreenTitle } from '@/components/ui/screen-title';
import { NumeralRow } from '@/components/ui/numeral-row';
import { useFinishedWorkouts } from '@/features/workouts/hooks';
import { activityDateLabel, activityMetaLabel } from '@/features/workouts/selectors';

// Finished-workout history, newest first (as NumeralRows), fed by the
// workout store's `useFinishedWorkouts`. Empty state preserved for a
// brand-new account with no finished sessions yet.
export default function ActivitiesScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const items = useFinishedWorkouts();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenTitle title="Activities" />
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
                <NumeralRow
                  key={workout.id}
                  numeral={day}
                  caption={month}
                  title={workout.title}
                  subtitle={activityMetaLabel(summary.durationSeconds, summary.volumeKg, summary.completedCount)}
                  onPress={() => router.push(`/workout/${workout.id}/summary`)}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
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
