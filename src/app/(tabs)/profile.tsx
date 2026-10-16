import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Screen } from '@/components/ui/screen';
import { ScreenTitle } from '@/components/ui/screen-title';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { useActiveProgram, useProgram } from '@/features/programs/hooks';
import { useFinishedWorkouts } from '@/features/workouts/hooks';
import { AccountActions, AccountCard } from '@/features/account/components/account-card';

/**
 * The hub for everything that isn't this week's training: who you are,
 * which programme you're on, and what you've already done.
 *
 * Each row carries its own count or name, so the screen answers "how much
 * is in there?" without you having to open it.
 */
export default function ProfileScreen() {
  const styles = useThemedStyles(createStyles);
  const active = useActiveProgram();
  const program = useProgram(active.data?.programId ?? '');
  const finished = useFinishedWorkouts();

  const programName = program.data?.name ?? 'No programme selected';
  const sessionCount = finished.length;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <ScreenTitle title="Profile" />

        <AccountCard />

        <View style={styles.rows}>
          <HubRow
            icon="list.bullet.rectangle"
            title="Plan"
            detail={programName}
            onPress={() => router.push('/plan')}
          />
          <HubRow
            icon="clock.arrow.circlepath"
            title="Activity"
            detail={
              sessionCount === 0
                ? 'No sessions logged yet'
                : `${sessionCount} session${sessionCount === 1 ? '' : 's'} logged`
            }
            onPress={() => router.push('/activities')}
          />
        </View>

        <AccountActions />
      </ScrollView>
    </Screen>
  );
}

function HubRow({
  icon,
  title,
  detail,
  onPress,
}: {
  icon: SFSymbol;
  title: string;
  detail: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.rowIcon}>
        <SymbolView name={icon} size={18} tintColor={theme.colors.ink} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDetail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <SymbolView name="chevron.right" size={15} tintColor={theme.colors.inkMuted} />
    </Pressable>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  rows: { gap: theme.spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    backgroundColor: theme.colors.glass,
    borderRadius: theme.radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.glassBorder,
    padding: theme.spacing.lg,
    ...theme.shadow.card,
  },
  rowPressed: { opacity: 0.85 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { ...theme.type.heading, color: theme.colors.ink },
  rowDetail: { ...theme.type.caption, color: theme.colors.inkMuted },
});
