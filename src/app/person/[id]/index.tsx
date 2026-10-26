import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { SectionLabel } from '@/components/ui/section-label';
import { DEFAULT_WEEKLY_TARGET, fetchProfile } from '@/features/account/api';
import { sessionsThisWeek, weekStreak } from '@/features/crews/streak';
import { QueryFallback } from '@/features/programs/components/query-fallback';
import { ProfileHeader } from '@/features/profile/components/profile-header';
import { SessionCard } from '@/features/profile/components/session-card';
import { WeeklyChart } from '@/features/profile/components/weekly-chart';
import { usePersonLogbook } from '@/features/stats/hooks';
import { workoutCard } from '@/features/stats/stats';

/**
 * A crewmate's profile: the same header, chart and sessions as your own,
 * read-only. Their rows come from a fetch the crew RLS allows
 * (`20261026010000_crew_profiles.sql`), covering the last few months.
 */
export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useThemedStyles(createStyles);
  const profile = useQuery({ queryKey: ['profile', id], queryFn: () => fetchProfile(id) });
  const log = usePersonLogbook(id);
  const now = new Date();

  if (log.isPending || log.isError) {
    return (
      <QueryFallback isError={log.isError} message="Couldn't load their training." onRetry={() => log.refetch()} />
    );
  }

  const book = log.data;
  const name = profile.data?.displayName ?? null;
  const target = profile.data?.weeklyTarget ?? DEFAULT_WEEKLY_TARGET;
  const starts = book.workouts.map((w) => w.started_at);

  return (
    <>
      {name != null && <Stack.Title>{name}</Stack.Title>}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <ProfileHeader
          name={name}
          stats={[
            { label: 'Streak', value: `${weekStreak(starts, target, now)} wk` },
            { label: 'This week', value: `${sessionsThisWeek(starts, now)}/${target}` },
          ]}
        />
        <WeeklyChart book={book} now={now} />
        <View style={styles.sessions}>
          <SectionLabel>Workouts</SectionLabel>
          {book.workouts.length === 0 ? (
            <Text style={styles.empty}>Nothing logged in the last few months.</Text>
          ) : (
            book.workouts.map((w) => (
              <SessionCard
                key={w.id}
                data={workoutCard(book, w)}
                now={now}
                onPress={() => router.push({ pathname: '/person/[id]/[workoutId]', params: { id, workoutId: w.id } })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { padding: theme.spacing.lg, gap: theme.spacing.xl, paddingBottom: theme.spacing.xxl },
  sessions: { gap: theme.spacing.sm },
  empty: { ...theme.type.body, color: theme.colors.inkMuted },
});
