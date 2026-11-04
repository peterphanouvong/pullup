import { StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { ShaderScrollView } from '@/features/backdrop/shader-scroll-view';
import { dateKey } from '@/features/programs/calendar';
import { CrewCard } from '@/features/crews/components/crew-card';
import { useMyCrews } from '@/features/crews/hooks';
import { crewWeekRange } from '@/features/crews/week';

/**
 * One crew, in full: the cover, then the week grid, pokes and the feed
 * (the `CrewCard`), whose ••• menu also sets the cover photo. Reached from
 * the crew's cover card on the Crew tab; the tab bar stays, since this is
 * still the Crew tab.
 */
export default function CrewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useThemedStyles(createStyles);
  const crews = useMyCrews();
  const crew = crews.data?.find((c) => c.id === id) ?? null;
  const now = new Date();
  const range = crewWeekRange(now);
  const todayKey = dateKey(now);

  return (
    <>
      {crew != null && <Stack.Title>{crew.name}</Stack.Title>}
      <ShaderScrollView
        vibe="crew"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {crew == null ? (
          <Text style={styles.empty}>{crews.isPending ? ' ' : 'You’re not in this crew any more.'}</Text>
        ) : (
          <>
            {crew.coverUrl != null && (
              <Image source={{ uri: crew.coverUrl }} style={styles.cover} contentFit="cover" transition={200} />
            )}
            <CrewCard crew={crew} range={range} todayKey={todayKey} now={now} />
          </>
        )}
      </ShaderScrollView>
    </>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  cover: { height: 180, borderRadius: theme.radii.xl, backgroundColor: theme.colors.card },
  empty: { ...theme.type.body, color: theme.colors.inkMuted, textAlign: 'center', paddingTop: 80 },
});
