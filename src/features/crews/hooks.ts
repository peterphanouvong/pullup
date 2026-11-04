import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth';
import {
  createCrew,
  fetchCrewFeed,
  fetchCrewWeek,
  fetchMyCrews,
  fetchPokes,
  joinCrew,
  leaveCrew,
  pokeCrewmate,
  setCrewCover,
  setReaction,
} from './api';
import { withMyReaction, type Checkin, type Reaction } from './feed';
import { useProfile } from '@/features/account/hooks';
import { useFinishedWorkouts } from '@/features/workouts/hooks';
import { useAvatars, useMyAvatar } from '@/features/sticker/hooks';
import { orderMembers, withLocalSessions, type CrewMemberWeek, type CrewWeekRange } from './week';

/** The crew's week as a card shows it: you on top with this phone's
 * sessions counted, then the rest. Empty while loading. */
export function useCrewMembers(week: CrewMemberWeek[] | undefined, range: CrewWeekRange): CrewMemberWeek[] {
  const session = useSession();
  const finished = useFinishedWorkouts();
  const starts = finished.map((f) => f.workout.started_at);
  return orderMembers(withLocalSessions(week ?? [], session.user.id, starts, range), session.user.id);
}

/** Everyone's sticker, yours from this phone if the upload hasn't landed
 * yet, so you never see yourself as an initial while crewmates have faces. */
export function useCrewAvatars(userIds: string[]): Record<string, string | null> {
  const session = useSession();
  const remote = useAvatars(userIds);
  const mine = useMyAvatar();
  return mine != null && remote[session.user.id] == null ? { ...remote, [session.user.id]: mine } : remote;
}

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
export const useSetCrewCover = () =>
  useCrewMutation((input: { crewId: string; picked: { uri: string; mimeType: string } }) =>
    setCrewCover(input.crewId, input.picked),
  );
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
