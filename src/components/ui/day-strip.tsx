import { Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

export interface DayStripItem {
  key: string;
  weekdayLabel: string; // e.g. "MON"
  dayNumber: number; // day-of-month numeral
  /** Resolved theme color for the session-kind dot; omit for no dot. */
  dotColor?: string;
  isToday?: boolean;
  isSelected?: boolean;
}

/** Mon–Sun horizontal strip: weekday label + day-of-month numeral, a
 * kind-colored dot under session days, a filled ring on today, and an
 * ink-filled circle (canvas-colored numeral) on the selected day. */
export function DayStrip({ items, onSelect }: { items: DayStripItem[]; onSelect: (key: string) => void }) {
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <Pressable key={item.key} style={styles.column} onPress={() => onSelect(item.key)}>
          <Text style={styles.weekday}>{item.weekdayLabel}</Text>
          <View style={[styles.numeralWrap, item.isToday && styles.todayRing, item.isSelected && styles.selectedFill]}>
            <Text style={[styles.dayNumber, item.isSelected && styles.selectedNumber]}>{item.dayNumber}</Text>
          </View>
          <View style={styles.dotSlot}>
            {item.dotColor != null && <View style={[styles.dot, { backgroundColor: item.dotColor }]} />}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  column: { flex: 1, alignItems: 'center', gap: theme.spacing.xs },
  weekday: { ...theme.type.label, color: theme.colors.inkMuted },
  numeralWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayRing: {
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  selectedFill: {
    backgroundColor: theme.colors.ink,
  },
  dayNumber: {
    ...theme.type.title,
    fontSize: 16,
    color: theme.colors.ink,
    fontVariant: ['tabular-nums'],
  },
  selectedNumber: { color: theme.colors.canvas },
  dotSlot: { height: 6, justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
}));
