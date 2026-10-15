import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import type { ProgramWeek } from '@/features/programs/types';

/** Approximate pill pitch used to pre-scroll the selected week into view. */
const PILL_PITCH = 96;

/** Horizontal week selector: the viewed week is a raised pill, the rest are
 * quiet labels; the calendar's current week carries a small dot marker. */
export function WeekPills({
  weeks,
  viewedPosition,
  currentPosition,
  onSelect,
}: {
  weeks: ProgramWeek[];
  viewedPosition: number;
  /** The week the calendar says we're in (start-date math). */
  currentPosition: number;
  onSelect: (position: number) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const scrollRef = useRef<ScrollView>(null);
  const didInitialScroll = useRef(false);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rowContent}
      style={styles.row}
      onLayout={() => {
        if (didInitialScroll.current) return;
        didInitialScroll.current = true;
        const index = weeks.findIndex((w) => w.position === viewedPosition);
        if (index > 1) {
          scrollRef.current?.scrollTo({ x: (index - 1) * PILL_PITCH, animated: false });
        }
      }}
    >
      {weeks.map((week) => {
        const isViewed = week.position === viewedPosition;
        const isCurrent = week.position === currentPosition;
        return (
          <Pressable
            key={week.id}
            onPress={() => onSelect(week.position)}
            style={({ pressed }) => [styles.pill, isViewed && styles.pillViewed, pressed && styles.pressed]}
          >
            <Text style={[styles.label, isViewed && styles.labelViewed]}>{`Week ${week.position}`}</Text>
            {isCurrent && <View style={styles.currentDot} />}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  // Bleed the scroller to the screen edges while the first pill still lines
  // up with the content column.
  row: { marginHorizontal: -theme.spacing.lg },
  rowContent: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.xs,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.pill,
  },
  pillViewed: {
    backgroundColor: theme.colors.card,
    ...theme.shadow.card,
  },
  pressed: { opacity: 0.7 },
  label: { ...theme.type.heading, color: theme.colors.inkMuted },
  labelViewed: { color: theme.colors.ink },
  currentDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.done,
  },
});
