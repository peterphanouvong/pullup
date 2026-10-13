import { FieldGroup, Host, ListItem } from '@expo/ui';
import type { DayExercise } from '../types';

function prescription(exercise: DayExercise): string {
  const setsReps = [exercise.sets, exercise.reps].filter((x) => x != null).join(' × ');
  return [setsReps || null, exercise.load, exercise.notes].filter((x) => x != null).join(' · ');
}

export function ExerciseTable({ exercises }: { exercises: DayExercise[] }) {
  return (
    <Host style={{ flex: 1 }}>
      <FieldGroup>
        <FieldGroup.Section title="Session">
          {exercises.map((exercise) => (
            <ListItem key={exercise.id} supportingText={prescription(exercise)}>
              {exercise.exerciseName}
            </ListItem>
          ))}
        </FieldGroup.Section>
      </FieldGroup>
    </Host>
  );
}
