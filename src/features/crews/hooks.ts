import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth';
import { createCrew, fetchCrewWeek, fetchMyCrews, joinCrew, leaveCrew } from './api';
import type { CrewWeekRange } from './week';

export function useMyCrews() {
  const session = useSession();
  return useQuery({
    queryKey: ['crews', session.user.id],
    queryFn: fetchMyCrews,
    enabled: !session.user.is_anonymous,
  });
}

export function useCrewWeek(crewId: string, range: CrewWeekRange) {
  return useQuery({
    queryKey: ['crew-week', crewId, range.fromIso],
    queryFn: () => fetchCrewWeek(crewId, range.fromIso, range.toIso),
  });
}

/** Create, join and leave all change which crews you're in. */
function useCrewMutation<T, R>(fn: (arg: T) => Promise<R>) {
  const session = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crews', session.user.id] }),
  });
}

export const useCreateCrew = () => useCrewMutation(createCrew);
export const useJoinCrew = () => useCrewMutation(joinCrew);
export const useLeaveCrew = () => useCrewMutation(leaveCrew);
