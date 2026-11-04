import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth';
import {
  fetchActiveProgram,
  fetchProgram,
  fetchProgramBrief,
  fetchProgramHistory,
  fetchPrograms,
  resumeProgram,
  saveDayExercises,
  selectProgram,
  setProgramStartDate,
  type DayExerciseDraft,
  type PastProgram,
} from './api';
import { startDateForWeek } from './schedule';
import { useFinishedWorkouts } from '@/features/workouts/hooks';

/** A past programme with what you did on it, from the local workout log. */
export interface PastProgramWithLog extends PastProgram {
  sessionCount: number;
  /** When you last trained on it, or null if you never did. */
  lastSessionAt: string | null;
  /** The week to pick up in: the last one you trained in, else week 1. */
  resumeWeek: number;
}

/** Programmes you've been on before, newest first, each with how far you
 * got. Empty until the active programme is known, so it's never listed
 * among its own history. */
export function useProgramHistory() {
  const session = useSession();
  const active = useActiveProgram();
  const finished = useFinishedWorkouts();
  const activeId = active.data?.programId ?? null;
  const query = useQuery({
    queryKey: ['program-history', session.user.id, activeId],
    queryFn: () => fetchProgramHistory(session.user.id, activeId),
    enabled: active.data !== undefined,
  });
  const programs: PastProgramWithLog[] = (query.data ?? []).map((program) => {
    const days = new Set(program.dayIds);
    const sessions = finished.filter((f) => f.workout.program_day_id != null && days.has(f.workout.program_day_id));
    const latest = sessions[0] ?? null; // newest first
    return {
      ...program,
      sessionCount: sessions.length,
      lastSessionAt: latest?.workout.started_at ?? null,
      resumeWeek: latest?.workout.program_day_id != null ? (program.weekOfDay[latest.workout.program_day_id] ?? 1) : 1,
    };
  });
  return { ...query, programs };
}

/** The answers a programme was built from; `null` once loaded when it
 * was a template copy, which has none. */
export function useProgramBrief(programId: string | null) {
  return useQuery({
    queryKey: ['program-brief', programId],
    queryFn: () => fetchProgramBrief(programId ?? ''),
    enabled: programId != null,
    staleTime: 5 * 60_000,
  });
}

/** Back onto a programme you were on: today lands in the week you left
 * off in, and the days keep their weekdays. */
export function useResumeProgram() {
  const session = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, weekPosition }: { programId: string; weekPosition: number }) =>
      resumeProgram(session.user.id, programId, startDateForWeek(new Date(), weekPosition)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-program', session.user.id] });
      queryClient.invalidateQueries({ queryKey: ['program-history', session.user.id] });
    },
  });
}

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
      queryClient.invalidateQueries({ queryKey: ['program-history', session.user.id] });
    },
  });
}

/** "I'm on this week": re-anchors the active programme so today falls in
 * the given week. The programme tab and widget follow the new start date. */
export function useSetProgramWeek() {
  const session = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ weekPosition }: { weekPosition: number }) =>
      setProgramStartDate(session.user.id, startDateForWeek(new Date(), weekPosition)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['active-program', session.user.id] }),
  });
}
