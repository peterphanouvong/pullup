import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth';
import { createCrew, fetchCrewFeed, fetchCrewWeek, fetchMyCrews, fetchPokes, joinCrew, leaveCrew, pokeCrewmate, setReaction } from './api';
import { withMyReaction, type Checkin, type Reaction } from './feed';
import { useProfile } from '@/features/account/hooks';
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
    // Callers with no crew yet pass '' rather than conditionally hooking.
    enabled: crewId.length > 0,
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

export function useCrewFeed(crewId: string, range: { fromIso: string; toIso: string }) {
  return useQuery({
    queryKey: ['crew-feed', crewId, range.fromIso],
    queryFn: () => fetchCrewFeed(crewId, range.fromIso, range.toIso),
  });
}

/** Toggles a reaction, showing it at once: the tap should land like a tap,
 * not a request. Every crew's feed that lists the workout is patched, and
 * all are refetched when the server answers either way. */
export function useSetReaction() {
  const session = useSession();
  const profile = useProfile();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workoutId, emoji }: { workoutId: string; emoji: Reaction | null }) => setReaction(workoutId, emoji),
    onMutate: async ({ workoutId, emoji }) => {
      await queryClient.cancelQueries({ queryKey: ['crew-feed'] });
      const myName = profile.data?.displayName ?? 'You';
      queryClient.setQueriesData<Checkin[]>({ queryKey: ['crew-feed'] }, (feed) =>
        feed ? withMyReaction(feed, workoutId, session.user.id, myName, emoji) : feed,
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['crew-feed'] }),
  });
}

/** The last day's pokes, both ways: who nudged you, and who you've nudged. */
export function usePokes() {
  const session = useSession();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['pokes', session.user.id],
    queryFn: () => fetchPokes(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    enabled: !session.user.is_anonymous,
  });
  const poke = useMutation({
    mutationFn: ({ crewId, userId }: { crewId: string; userId: string }) => pokeCrewmate(crewId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pokes', session.user.id] }),
  });
  return { ...query, poke };
}
