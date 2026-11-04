import { useCallback, useEffect, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { NativeButton } from '@/components/ui/native-button';
import { useSession } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { AccountCard } from '@/features/account/components/account-card';
import { dateKey } from '@/features/programs/calendar';
import { CrewCoverCard } from '@/features/crews/components/crew-cover-card';
import { useMyCrews } from '@/features/crews/hooks';
import { useCrewPrompts } from '@/features/crews/use-crew-prompts';
import { crewWeekRange } from '@/features/crews/week';
import { YourWeekCard } from '@/features/crews/components/your-week-card';
import { NotificationsNudge } from '@/features/notifications/components/notifications-nudge';
import { ShaderScrollView } from '@/features/backdrop/shader-scroll-view';

/**
 * Your crews: small private groups of mates who can see who's trained this
 * week. Invite-only, by code — there's no search and no public profile.
 */
export default function CrewScreen() {
  const session = useSession();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const queryClient = useQueryClient();
  const crews = useMyCrews();
  // Create and join are shared with onboarding's last step.
  const { promptCreate, promptJoin, confirmJoin } = useCrewPrompts();
  // Set by an invite link (src/app/join/[code].tsx). Asked once, then
  // cleared, so coming back to the tab doesn't ask again.
  const { join } = useLocalSearchParams<{ join?: string }>();
  useEffect(() => {
    if (!join) return;
    router.setParams({ join: undefined });
    confirmJoin(join);
  }, [join, confirmJoin]);
  const [refreshing, setRefreshing] = useState(false);

  const now = new Date();
  const range = crewWeekRange(now);
  const todayKey = dateKey(now);

  // Coming back to the tab is when you want to see who's trained since.
  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: ['crew-week'] });
      void queryClient.invalidateQueries({ queryKey: ['crew-feed'] });
    }, [queryClient]),
  );

  async function refresh() {
    setRefreshing(true);
    haptics.select();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['crews'] }),
      queryClient.invalidateQueries({ queryKey: ['crew-week'] }),
      queryClient.invalidateQueries({ queryKey: ['crew-feed'] }),
      queryClient.invalidateQueries({ queryKey: ['pokes'] }),
    ]);
    setRefreshing(false);
  }

  function openAddMenu() {
    haptics.tap();
    ActionSheetIOS.showActionSheetWithOptions(
      { options: ['Create a crew', 'Join with a code', 'Cancel'], cancelButtonIndex: 2 },
      (index) => {
        if (index === 0) promptCreate();
        if (index === 1) promptJoin();
      },
    );
  }

  const isGuest = session.user.is_anonymous;
  const list = crews.data ?? [];

  return (
    <>
      {/* Add-a-crew sits in the bar, next to the title it belongs to. It
          only appears once you have a crew — with none, the empty state's
          own two buttons are the way in. */}
      {!isGuest && list.length > 0 && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon="plus"
            accessibilityLabel="Add a crew"
            hidesSharedBackground
            tintColor={theme.colors.ink}
            onPress={openAddMenu}
          />
        </Stack.Toolbar>
      )}
      <ShaderScrollView
        vibe="crew"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={isGuest ? undefined : <RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {isGuest ? (
          <>
            <Text style={styles.lede}>
              Train with your mates. See who’s been in this week, and let them see you.
            </Text>
            <AccountCard />
          </>
        ) : crews.isPending ? (
          <ActivityIndicator style={styles.loading} />
        ) : crews.isError ? (
          <Text style={styles.lede}>Couldn’t load your crews. Pull to refresh.</Text>
        ) : list.length === 0 ? (
          <Card style={styles.empty}>
            <View style={styles.emptyText}>
              <Text style={styles.emptyTitle}>Start a crew</Text>
              <Text style={styles.lede}>
                Up to 8 mates. See who’s trained each day this week, cheer each other on, and open each
                other’s sessions to see what they lifted.
              </Text>
            </View>
            <NativeButton label="Create a crew" variant="primary" systemImage="plus" onPress={() => promptCreate()} />
            <NativeButton label="Join with a code" onPress={() => promptJoin()} />
          </Card>
        ) : (
          <>
            <YourWeekCard range={range} todayKey={todayKey} now={now} />
            <NotificationsNudge />
            {/* Photo-first: each crew is its cover and who's been in this
                week. The grid, pokes and feed live on the crew's own page. */}
            {list.map((crew) => (
              <CrewCoverCard key={crew.id} crew={crew} range={range} />
            ))}
          </>
        )}
      </ShaderScrollView>
    </>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  lede: { ...theme.type.body, color: theme.colors.inkMuted },
  loading: { paddingVertical: theme.spacing.xl },
  empty: { gap: theme.spacing.md },
  emptyText: { gap: theme.spacing.xs, marginBottom: theme.spacing.xs },
  emptyTitle: { ...theme.type.heading, color: theme.colors.ink },
});
