import { StyleSheet, View } from 'react-native';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { Card } from '@/components/ui/card';
import { NumeralRow } from '@/components/ui/numeral-row';
import { SectionLabel } from '@/components/ui/section-label';
import type { DayExercise } from '../types';

function prescription(exercise: DayExercise): string | undefined {
  const setsReps = [exercise.sets, exercise.reps].filter((x) => x != null).join(' × ');
  const parts = [setsReps || null, exercise.load, exercise.notes].filter((x) => x != null);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export function ExerciseTable({ exercises }: { exercises: DayExercise[] }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.wrap}>
      <SectionLabel>Session</SectionLabel>
      <Card style={styles.card}>
        {exercises.map((exercise) => (
          <NumeralRow
            key={exercise.id}
            numeral={exercise.position}
            caption="EX"
            title={exercise.exerciseName}
            subtitle={prescription(exercise)}
          />
        ))}
      </Card>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  wrap: { gap: theme.spacing.sm },
  card: { paddingVertical: theme.spacing.xs },
});
