import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { NativeButton } from '@/components/ui/native-button';
import { SectionLabel } from '@/components/ui/section-label';
import { useSession } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { AccountActions, AccountCard, promptForName } from '@/features/account/components/account-card';
import { DEFAULT_WEEKLY_TARGET, saveDisplayName } from '@/features/account/api';
import { useProfile } from '@/features/account/hooks';
import { sessionsThisWeek, weekStreak } from '@/features/crews/streak';
import { DevPanel } from '@/features/dev/dev-panel';
import { DashboardGrid } from '@/features/profile/components/dashboard-grid';
import { ProfileHeader } from '@/features/profile/components/profile-header';
import { SessionCard } from '@/features/profile/components/session-card';
import { ballRadius, SessionJar } from '@/features/profile/components/session-jar';
import { WeeklyChart } from '@/features/profile/components/weekly-chart';
import { useMyLogbook } from '@/features/stats/hooks';
import { workoutCard } from '@/features/stats/stats';
import { ShaderScrollView } from '@/features/backdrop/shader-scroll-view';

const RECENT_SESSIONS = 5;

/**
 * You, Hevy-style: who you are and how you've been showing up (sessions,
 * the weekly streak, this week against your target), twelve weeks as a
 * chart, the way into stats, calendar, plan and history, then your latest
 * sessions. The same layout a crewmate sees of you (`/person/[id]`).
 */
export default function ProfileScreen() {
  const session = useSession();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const queryClient = useQueryClient();
  const profile = useProfile();
  const book = useMyLogbook();
  const now = new Date();

  const target = profile.data?.weeklyTarget ?? DEFAULT_WEEKLY_TARGET;
  const starts = book.workouts.map((w) => w.started_at);
  // The jar: one ball per session, sized by how long it ran. Capped so the
  // physics stays cheap once the log is long.
  const balls = book.workouts.slice(0, 80).map((w) => ({
    id: w.id,
    radius: ballRadius(workoutCard(book, w).durationSeconds),
    tone: w.program_day_id != null ? ('lift' as const) : ('other' as const),
  }));
  const name = profile.data?.displayName ?? null;
  const isGuest = session.user.is_anonymous;

  function rename() {
    haptics.tap();
    promptForName(name ?? '', async (next) => {
      await saveDisplayName(session.user.id, next);
      await queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] });
    });
  }

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
      {/* A guest gets the case for signing in first: crews and a name
          need an account. */}
      {isGuest && <AccountCard />}

      <ProfileHeader
        name={isGuest ? 'You' : name}
        onPressName={isGuest ? undefined : rename}
        stats={[
          { label: 'Workouts', value: String(book.workouts.length) },
          { label: 'Streak', value: `${weekStreak(starts, target, now)} wk` },
          { label: 'This week', value: `${sessionsThisWeek(starts, now)}/${target}` },
        ]}
      />

      <SessionJar balls={balls} />

      <WeeklyChart book={book} now={now} />

      <DashboardGrid
        tiles={[
          { icon: 'trophy', label: 'Exercises', onPress: () => router.push('/stats') },
          { icon: 'calendar', label: 'Calendar', onPress: () => router.push('/calendar') },
          { icon: 'list.bullet.rectangle', label: 'Plan', onPress: () => router.push('/plan') },
          { icon: 'clock.arrow.circlepath', label: 'Activity', onPress: () => router.push('/activities') },
        ]}
      />

      <View style={styles.sessions}>
        <SectionLabel>Workouts</SectionLabel>
        {book.workouts.length === 0 ? (
          <Text style={styles.empty}>Your sessions show up here once you finish one.</Text>
        ) : (
          book.workouts.slice(0, RECENT_SESSIONS).map((w) => (
            <SessionCard
              key={w.id}
              data={workoutCard(book, w)}
              now={now}
              onPress={() => router.push({ pathname: '/workout/[id]/summary', params: { id: w.id, view: '1' } })}
              onShare={() => router.push({ pathname: '/workout/[id]/summary', params: { id: w.id, share: '1' } })}
            />
          ))
        )}
        {book.workouts.length > RECENT_SESSIONS && (
          <NativeButton variant="ghost" label="See all workouts" onPress={() => router.push('/activities')} />
        )}
      </View>

      <AccountActions />
      {/* The backdrop dials (see features/backdrop): in every build for
          now, so the look can be tuned on a real phone over TestFlight. */}
      <NativeButton
        variant="ghost"
        label="Tune the look"
        labelColor={theme.colors.inkMuted}
        onPress={() => {
          haptics.tap();
          router.push('/vibe-lab');
        }}
      />
      {/* Jump links for trying flows that gate themselves; dev builds only. */}
      {__DEV__ && <DevPanel />}
    </ShaderScrollView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { padding: theme.spacing.lg, gap: theme.spacing.xl, paddingBottom: theme.spacing.xxl },
  sessions: { gap: theme.spacing.sm },
  empty: { ...theme.type.body, color: theme.colors.inkMuted },
});
