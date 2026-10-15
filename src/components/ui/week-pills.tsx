import { useRef } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, HStack, Host, Text } from '@expo/ui/swift-ui';
import { buttonStyle, foregroundColor, tint } from '@expo/ui/swift-ui/modifiers';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import type { ProgramWeek } from '@/features/programs/types';

/** Approximate pill pitch used to pre-scroll the selected week into view. */
const PILL_PITCH = 96;

/** Tall enough for the prominent (selected) pill plus breathing room above
 * and below, so the row never clips it or jumps height on selection. */
const WEEK_PILL_ROW_HEIGHT = 68;

/** Horizontal week selector built from real SwiftUI buttons (liquid glass on
 * iOS 26+): the viewed week is `glassProminent` filled white (`ink`), the
 * rest plain `glass`. A selector reads as navigation, not an action, so it
 * stays neutral rather than taking the primary blue. A
 * single Host wraps the whole HStack — one SwiftUI hosting view for the row
 * rather than one per pill — sized to its content and scrolled by an RN
 * ScrollView. */
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
  const theme = useTheme();
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
      {/* Labels are explicit Text: SwiftUI's default prominent label is
          white, which would vanish into the white fill. */}
      <Host matchContents seedColor={theme.colors.ink}>
        <HStack spacing={8}>
          {weeks.map((week) => {
            const isViewed = week.position === viewedPosition;
            return (
              <Button
                key={week.id}
                onPress={() => onSelect(week.position)}
                modifiers={[
                  buttonStyle(isViewed ? 'glassProminent' : 'glass'),
                  ...(isViewed ? [tint(theme.colors.ink)] : []),
                ]}
              >
                {/* The calendar's current week keeps a dot marker so it stays
                    findable once you've scrolled to another week. */}
                <Text modifiers={[foregroundColor(isViewed ? theme.colors.canvas : theme.colors.ink)]}>
                  {week.position === currentPosition ? `Week ${week.position} ·` : `Week ${week.position}`}
                </Text>
              </Button>
            );
          })}
        </HStack>
      </Host>
    </ScrollView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  // Bleed the scroller to the screen edges while the first pill still lines
  // up with the content column. The fixed height keeps the row from
  // resizing as the selected pill grows into its prominent style (the
  // ScrollView clips, so a growing pill would otherwise be cut off).
  row: { marginHorizontal: -theme.spacing.lg, height: WEEK_PILL_ROW_HEIGHT },
  rowContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
});
