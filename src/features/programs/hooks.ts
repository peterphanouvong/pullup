import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth';
import {
  fetchActiveProgram,
  fetchProgram,
  fetchPrograms,
  saveDayExercises,
  selectProgram,
  type DayExerciseDraft,
} from './api';

export function usePrograms() {
  return useQuery({ queryKey: ['programs'], queryFn: fetchPrograms });
}

export function useProgram(id: string) {
  return useQuery({
    queryKey: ['programs', id],
    queryFn: () => fetchProgram(id),
    enabled: id.length > 0,
  });
}

export function useActiveProgram() {
  const session = useSession();
  return useQuery({
    queryKey: ['active-program', session.user.id],
    queryFn: () => fetchActiveProgram(session.user.id),
  });
}

/** A day of the active programme by id, or null while loading or when the
 * day belongs to another programme (an old workout, say). */
export function useActiveProgramDay(dayId: string | null) {
  const active = useActiveProgram();
  const program = useProgram(dayId != null ? (active.data?.programId ?? '') : '');
  if (dayId == null || program.data == null) return null;
  for (const week of program.data.weeks) {
    const day = week.days.find((d) => d.id === dayId);
    if (day) return day;
  }
  return null;
}

/** Saves an edited programme day. The whole programme is refetched after:
 * a day's exercises show up on the week list and the preview too, and
 * one refetch is cheaper than keeping three caches honest. */
export function useSaveDayExercises(programId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      dayId,
      drafts,
      removedIds,
    }: {
      dayId: string;
      drafts: DayExerciseDraft[];
      removedIds: string[];
    }) => saveDayExercises(dayId, drafts, removedIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['programs', programId] }),
  });
}

export function useSelectProgram() {
  const session = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ programId }: { programId: string }) => selectProgram(programId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-program', session.user.id] });
      // The new instance is a new programme id; make sure it's not served stale.
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}
