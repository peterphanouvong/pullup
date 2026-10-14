import { ScrollView, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Screen } from '@/components/ui/screen';
import { ScreenTitle } from '@/components/ui/screen-title';

// Finished-workout history, newest first (as NumeralRows), fed by sub-project
// B's workout store. Until that store lands this tab only ever shows the
// empty state.
export default function ActivitiesScreen() {
  const { theme } = useUnistyles();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenTitle title="Activities" />
        <View style={styles.empty}>
          <SymbolView
            name="clock.arrow.circlepath"
            size={40}
            tintColor={theme.colors.inkMuted}
            fallback={<Text style={styles.emptyIconFallback}>⏱</Text>}
          />
          <Text style={styles.emptyText}>No workouts yet — your first session will show up here.</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: 140, flexGrow: 1 },
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
}));
