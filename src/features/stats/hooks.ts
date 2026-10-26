import { useQuery } from '@tanstack/react-query';
import { useSelector } from '@legendapp/state/react';
import { workoutExercises$, workoutSets$, workouts$ } from '@/features/workouts/store';
import { fetchPersonLog } from './api';
import { logbookFrom, type Logbook } from './stats';

/** Your own logbook, live from the workout store. */
export function useMyLogbook(): Logbook {
  return useSelector(() => logbookFrom(workouts$.get() ?? {}, workoutExercises$.get() ?? {}, workoutSets$.get() ?? {}));
}

/** A crewmate's recent logbook, fetched for their profile. */
export function usePersonLogbook(userId: string) {
  return useQuery({
    queryKey: ['person-log', userId],
    queryFn: async () => {
      const rows = await fetchPersonLog(userId, new Date());
      return logbookFrom(rows.workouts, rows.exercises, rows.sets);
    },
  });
}
