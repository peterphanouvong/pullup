import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import type { ProgramWeek } from '@/features/programs/types';

/** Bottom sheet (native pageSheet modal) for jumping the Today screen to any
 * programme week. The current calendar week is tagged; the week being viewed
 * gets the checkmark. */
export function WeekPickerSheet({
  visible,
  weeks,
  currentPosition,
  viewedPosition,
  onSelect,
  onClose,
}: {
  visible: boolean;
  weeks: ProgramWeek[];
  /** The week the calendar says we're in (start-date math). */
  currentPosition: number;
  /** The week the Today screen is showing. */
  viewedPosition: number;
  onSelect: (position: number) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Weeks</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.doneLabel}>Done</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {weeks.map((week) => {
            const isCurrent = week.position === currentPosition;
            const isViewed = week.position === viewedPosition;
            return (
              <Pressable
                key={week.id}
                onPress={() => onSelect(week.position)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{`Week ${week.position}`}</Text>
                  <Text style={styles.rowMeta}>{week.phase}</Text>
                </View>
                {isCurrent && <Text style={styles.currentTag}>THIS WEEK</Text>}
                {isViewed && (
                  <SymbolView name="checkmark" size={16} tintColor={theme.colors.ink} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  title: { ...theme.type.title, color: theme.colors.ink },
  doneLabel: { ...theme.type.heading, color: theme.colors.ink },
  list: { padding: theme.spacing.lg, paddingTop: theme.spacing.sm, gap: theme.spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    ...theme.shadow.card,
  },
  rowPressed: { opacity: 0.85 },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { ...theme.type.heading, color: theme.colors.ink },
  rowMeta: { ...theme.type.caption, color: theme.colors.inkMuted },
  currentTag: { ...theme.type.label, color: theme.colors.done },
});
