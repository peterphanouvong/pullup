import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { SectionLabel } from '@/components/ui/section-label';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { useExerciseSearch, useRecentExercises } from '../hooks';
import type { Exercise } from '../types';

/**
 * The searchable exercise library list — reused by `/workout/picker` in both
 * `add` and `replace` mode (the modal route owns the header/close button and
 * what happens on pick; this component is just the list UI). Fully offline,
 * reading straight off the `exercises$` store.
 */
export function ExercisePicker({ onPick }: { onPick: (exercise: Exercise) => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);

  // Unfiltered pass, just to derive the chip row's distinct muscle groups —
  // cheap (one more `.get()` over the same already-live-subscribed record).
  const allExercises = useExerciseSearch('', null);
  const groups = useMemo(
    () => Array.from(new Set(allExercises.map((e) => e.muscle_group))).sort((a, b) => a.localeCompare(b)),
    [allExercises],
  );

  const results = useExerciseSearch(query, group);
  const recent = useRecentExercises();
  // Recent only makes sense as a "what did I just do" shortcut in the default
  // browse state — once the user is searching, a result list filtered by
  // their query is the whole screen.
  const showRecent = query.trim().length === 0 && recent.length > 0;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.searchField}>
        <SymbolView
          name="magnifyingglass"
          size={16}
          tintColor={theme.colors.inkMuted}
          fallback={<Text style={{ color: theme.colors.inkMuted }}>⌕</Text>}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises"
          placeholderTextColor={theme.colors.inkMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        <GroupChip label="All" active={group == null} onPress={() => setGroup(null)} />
        {groups.map((g) => (
          <GroupChip key={g} label={g} active={group === g} onPress={() => setGroup(group === g ? null : g)} />
        ))}
      </ScrollView>

      {showRecent && (
        <View style={styles.section}>
          <SectionLabel>RECENT</SectionLabel>
          {recent.map((exercise) => (
            <ExerciseRow key={`recent-${exercise.id}`} exercise={exercise} onPress={() => onPick(exercise)} />
          ))}
        </View>
      )}

      <View style={styles.section}>
        <SectionLabel>ALL EXERCISES</SectionLabel>
        {results.length === 0 ? (
          <Text style={styles.empty}>No exercises match.</Text>
        ) : (
          results.map((exercise) => <ExerciseRow key={exercise.id} exercise={exercise} onPress={() => onPick(exercise)} />)
        )}
      </View>
    </ScrollView>
  );
}

function GroupChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function ExerciseRow({ exercise, onPress }: { exercise: Exercise; onPress: () => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <Text style={styles.rowTitle}>{exercise.name}</Text>
      <Text style={styles.rowCaption}>{`${exercise.muscle_group} · ${exercise.equipment}`}</Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  content: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  searchInput: { ...theme.type.body, color: theme.colors.ink, flex: 1, padding: 0 },
  chipRow: { flexDirection: 'row', gap: theme.spacing.sm, paddingVertical: theme.spacing.xs },
  chip: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  chipActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  chipLabel: { ...theme.type.label, color: theme.colors.inkMuted },
  chipLabelActive: { color: theme.colors.onAccent },
  section: { gap: theme.spacing.xs },
  empty: { ...theme.type.body, color: theme.colors.inkMuted, paddingVertical: theme.spacing.md },
  row: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    gap: 2,
  },
  rowPressed: { opacity: 0.6 },
  rowTitle: { ...theme.type.heading, color: theme.colors.ink },
  rowCaption: { ...theme.type.caption, color: theme.colors.inkMuted },
});
