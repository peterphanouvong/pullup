import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { SwipeToDelete } from '@/components/ui/swipe-to-delete';
import { SessionCard } from '@/features/profile/components/session-card';
import { useMyLogbook } from '@/features/stats/hooks';
import { workoutCard } from '@/features/stats/stats';
import { discardWorkout } from '@/features/workouts/hooks';
import { ShaderScrollView } from '@/features/backdrop/shader-scroll-view';

/**
 * Every finished session, newest first: the same cards, from the same
 * logbook, as the Profile tab's "Workouts" (which shows the first few and
 * sends people here). Tap for the session's overview; swipe to delete.
 */
function confirmDelete(workoutId: string, title: string): void {
  Alert.alert('Delete workout?', `"${title}" and everything logged in it will be removed.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => discardWorkout(workoutId) },
  ]);
}

export default function ActivitiesScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const book = useMyLogbook();
  const now = new Date();

  // No wrapper view: the bar is transparent, and UIKit only finds the
  // ScrollView to draw its scroll-edge effect over when that view is the
  // screen's first subview.
  return (
    <ShaderScrollView
      vibe="profile"
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
    >
      {book.workouts.length === 0 ? (
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
        <View style={styles.list}>
          {book.workouts.map((w) => (
            <SwipeToDelete
              key={w.id}
              onDelete={() => confirmDelete(w.id, w.title)}
              childStyle={styles.swipeChild}
            >
              <SessionCard
                data={workoutCard(book, w)}
                now={now}
                onPress={() => router.push({ pathname: '/workout/[id]/summary', params: { id: w.id, view: '1' } })}
                onShare={() => router.push({ pathname: '/workout/[id]/summary', params: { id: w.id, share: '1' } })}
              />
            </SwipeToDelete>
          ))}
        </View>
      )}
    </ShaderScrollView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xl, flexGrow: 1 },
  list: { gap: theme.spacing.sm },
  // The card is glass with its own radius; the swipe wrapper stays clear
  // so it doesn't put a square canvas slab behind the rounded corners.
  swipeChild: { backgroundColor: 'transparent', borderRadius: theme.radii.xl },
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
