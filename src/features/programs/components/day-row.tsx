import { Button, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import type { ProgramDay } from '../types';

const KIND_ICON: Record<ProgramDay['kind'], string> = {
  lifting: '🏋️', court: '🏐', rest: '😴', comp: '🏆',
};

export function DayRow({ day, onPress }: { day: ProgramDay; onPress: () => void }) {
  const tappable = day.kind === 'lifting' && day.exercises.length > 0;
  return (
    <View style={styles.container}>
      {tappable ? (
        <Button title={`${KIND_ICON[day.kind]} ${day.name}`} onPress={onPress} />
      ) : (
        <Text style={styles.name}>{`${KIND_ICON[day.kind]} ${day.name}`}</Text>
      )}
      {day.notes != null && <Text style={styles.notes}>{day.notes}</Text>}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { gap: theme.spacing.xs },
  name: { ...theme.type.heading, color: theme.colors.ink },
  notes: { ...theme.type.caption, color: theme.colors.inkMuted },
}));
