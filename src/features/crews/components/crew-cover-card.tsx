import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { haptics } from '@/lib/haptics';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { Avatar } from '@/features/sticker/components/avatar';
import type { Crew } from '../api';
import { useCrewAvatars, useCrewMembers, useCrewWeek } from '../hooks';
import type { CrewWeekRange } from '../week';

const HEIGHT = 196;
const STACK_SIZE = 40;
const STACK_SHOWN = 6;

/**
 * A crew on the Crew tab: its cover photo, its name, and the one thing to
 * know at a glance (who's trained this week, as a row of stickers with the
 * ones who have lit up). Everything else is a tap away on the crew's page.
 * Without a cover it sits on the recap gradient, which is the prompt to
 * add one.
 */
export function CrewCoverCard({ crew, range }: { crew: Crew; range: CrewWeekRange }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const week = useCrewWeek(crew.id, range);
  const members = useCrewMembers(week.data, range);
  const avatars = useCrewAvatars(members.map((m) => m.userId));
  const trained = members.filter((m) => m.sessionCount > 0);
  const glance =
    week.data == null
      ? `${crew.memberCount} ${crew.memberCount === 1 ? 'member' : 'members'}`
      : trained.length === 0
        ? 'Nobody in yet this week'
        : trained.length === members.length
          ? 'Everyone’s trained this week'
          : `${trained.length} of ${members.length} trained this week`;

  function open() {
    haptics.tap();
    router.push({ pathname: '/crew/[id]', params: { id: crew.id } });
  }

  return (
    <Pressable onPress={open} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {crew.coverUrl ? (
        <Image source={{ uri: crew.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      ) : (
        <LinearGradient
          colors={theme.colors.gradientRecap}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {/* Text sits on a darkening from the foot, whatever the photo. */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.78)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {crew.name}
        </Text>
        <View style={styles.foot}>
          <View style={styles.stack}>
            {members.slice(0, STACK_SHOWN).map((m, i) => (
              <View
                key={m.userId}
                style={[styles.stackItem, i > 0 && styles.stackOverlap, m.sessionCount === 0 && styles.stackDim]}
              >
                <Avatar uri={avatars[m.userId]} name={m.displayName} size={STACK_SIZE} />
              </View>
            ))}
            {members.length > STACK_SHOWN && (
              <View style={[styles.stackItem, styles.stackOverlap, styles.more]}>
                <Text style={styles.moreText}>{`+${members.length - STACK_SHOWN}`}</Text>
              </View>
            )}
          </View>
          <Text style={styles.glance} numberOfLines={1}>
            {glance}
          </Text>
        </View>
      </View>
      {crew.coverUrl == null && <Text style={styles.addCover}>Tap to add a cover photo</Text>}
    </Pressable>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  card: {
    height: HEIGHT,
    borderRadius: theme.radii.xl,
    overflow: 'hidden',
    backgroundColor: theme.colors.card,
    ...theme.shadow.card,
  },
  pressed: { opacity: 0.9 },
  body: { flex: 1, justifyContent: 'space-between', padding: theme.spacing.lg },
  name: { ...theme.type.title, color: theme.colors.onGradient, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 8 },
  foot: { gap: theme.spacing.sm },
  stack: { flexDirection: 'row', alignItems: 'center' },
  stackItem: { width: STACK_SIZE, height: STACK_SIZE },
  stackOverlap: { marginLeft: -STACK_SIZE * 0.3 },
  // Not in yet this week: still there, just quieter.
  stackDim: { opacity: 0.45 },
  more: {
    borderRadius: STACK_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: { ...theme.type.caption, color: theme.colors.onGradient },
  glance: { ...theme.type.body, color: theme.colors.onGradient, fontWeight: '600' },
  addCover: {
    ...theme.type.caption,
    color: 'rgba(255,255,255,0.7)',
    position: 'absolute',
    top: theme.spacing.lg,
    right: theme.spacing.lg,
  },
});
