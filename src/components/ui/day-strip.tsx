import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

export interface DayStripItem {
  key: string;
  weekdayLabel: string; // e.g. "MON"
  dayNumber: number; // day-of-month numeral
  /** Resolved theme color for the session-kind dot; omit for no dot. */
  dotColor?: string;
  isToday?: boolean;
  /** Calendar days already behind us — rendered faded. */
  isPast?: boolean;
}

/** Calendar-app style Mon–Sun strip: kind-colored dot above, day-of-month
 * numeral, tiny weekday label below. Today sits in a rounded-rect outline
 * with its weekday tinted; passed days fade out. */
export function DayStrip({ items, onSelect }: { items: DayStripItem[]; onSelect: (key: string) => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <Pressable
          key={item.key}
          style={[styles.column, item.isPast && !item.isToday && styles.columnPast]}
          onPress={() => onSelect(item.key)}
        >
          <View style={styles.dotSlot}>
            {item.dotColor != null && <View style={[styles.dot, { backgroundColor: item.dotColor }]} />}
          </View>
          <View style={[styles.cell, item.isToday && styles.cellToday]}>
            <Text style={[styles.dayNumber, !item.isToday && styles.dayNumberQuiet]}>{item.dayNumber}</Text>
            <Text style={[styles.weekday, item.isToday && styles.weekdayToday]}>{item.weekdayLabel}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  column: { flex: 1, alignItems: 'center', gap: theme.spacing.xs },
  columnPast: { opacity: 0.4 },
  dotSlot: { height: 6, justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  cell: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cellToday: { borderColor: theme.colors.ink },
  dayNumber: {
    ...theme.type.title,
    fontSize: 17,
    color: theme.colors.ink,
    fontVariant: ['tabular-nums'],
  },
  dayNumberQuiet: { color: theme.colors.inkMuted },
  weekday: { ...theme.type.label, fontSize: 10, color: theme.colors.inkMuted },
  weekdayToday: { color: theme.colors.done },
});
