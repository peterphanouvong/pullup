import { Button, Text, View } from 'react-native';
import type { ProgramDay } from '../types';

const KIND_ICON: Record<ProgramDay['kind'], string> = {
  lifting: '🏋️', court: '🏐', rest: '😴', comp: '🏆',
};

export function DayRow({ day, onPress }: { day: ProgramDay; onPress: () => void }) {
  const tappable = day.kind === 'lifting' && day.exercises.length > 0;
  return (
    <View style={{ gap: 2 }}>
      {tappable ? (
        <Button title={`${KIND_ICON[day.kind]} ${day.name}`} onPress={onPress} />
      ) : (
        <Text>{`${KIND_ICON[day.kind]} ${day.name}`}</Text>
      )}
      {day.notes != null && <Text>{day.notes}</Text>}
    </View>
  );
}
