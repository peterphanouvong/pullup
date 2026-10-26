import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { bestLabel, dayMonth } from '@/features/profile/format';
import { useMyLogbook } from '@/features/stats/hooks';
import { personalBests } from '@/features/stats/stats';

/**
 * Every exercise you've logged, most-done first, with its best set: the
 * "what am I lifting now?" list. Tap one for its history.
 */
export default function ExercisesScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const bests = personalBests(useMyLogbook());

  return (
    <FlatList
      style={styles.scroll}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      data={bests}
      keyExtractor={(b) => b.key}
      ListEmptyComponent={<Text style={styles.empty}>Finish a session and your exercises and bests show up here.</Text>}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => (
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          onPress={() => router.push({ pathname: '/stats/[key]', params: { key: item.key } })}
        >
          <View style={styles.body}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.detail}>
              {`${item.sessions} ${item.sessions === 1 ? 'session' : 'sessions'} · last ${dayMonth(item.lastDoneAt)}`}
            </Text>
          </View>
          <Text style={styles.best}>{bestLabel(item)}</Text>
          <SymbolView name="chevron.right" size={13} tintColor={theme.colors.inkMuted} />
        </Pressable>
      )}
    />
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.md },
  pressed: { opacity: 0.6 },
  body: { flex: 1, gap: 2 },
  name: { ...theme.type.heading, color: theme.colors.ink },
  detail: { ...theme.type.caption, color: theme.colors.inkMuted },
  best: { ...theme.type.body, color: theme.colors.ink, fontWeight: '600', fontVariant: ['tabular-nums'] },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
  empty: { ...theme.type.body, color: theme.colors.inkMuted, textAlign: 'center', paddingTop: theme.spacing.xl },
});
