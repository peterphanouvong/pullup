import { useEffect } from 'react';
import { observable } from '@legendapp/state';
import { useSelector } from '@legendapp/state/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth';
import { useProfile } from '@/features/account/hooks';
import { fetchAvatars, loadLocalSticker, uploadSticker } from './api';

/** Each user's sticker on this device, by id; `undefined` until checked. */
const localSticker$ = observable<Record<string, string | null | undefined>>({});

/** Remembers a freshly rendered sticker so every screen updates at once. */
export function setLocalSticker(userId: string, uri: string): void {
  localSticker$[userId].set(uri);
}

/** Your own sticker: the uploaded one when there is one, else this
 * device's copy, else null (the initial-in-a-circle fallback). */
export function useMyAvatar(): string | null {
  const session = useSession();
  const userId = session.user.id;
  const profile = useProfile();
  const local = useSelector(() => localSticker$[userId].get());
  useEffect(() => {
    if (local === undefined) localSticker$[userId].set(loadLocalSticker(userId));
  }, [local, userId]);
  return profile.data?.avatarUrl ?? local ?? null;
}

/** Other people's stickers, by user id. */
export function useAvatars(userIds: string[]): Record<string, string | null> {
  const key = [...userIds].sort();
  const query = useQuery({
    queryKey: ['avatars', key],
    queryFn: () => fetchAvatars(key),
    enabled: key.length > 0,
    staleTime: 5 * 60_000,
  });
  return query.data ?? {};
}

/**
 * Once there's an account, the sticker made as a guest goes up so crewmates
 * can see it. Mounted once at the root; does nothing for guests or when
 * the profile already has one.
 */
export function AvatarSync() {
  const session = useSession();
  const profile = useProfile();
  const queryClient = useQueryClient();
  const userId = session.user.id;
  const isGuest = session.user.is_anonymous ?? false;
  const hasRemote = profile.data?.avatarUrl != null;
  const profileLoaded = profile.data !== undefined;

  useEffect(() => {
    if (isGuest || !profileLoaded || hasRemote) return;
    if (loadLocalSticker(userId) == null) return;
    let cancelled = false;
    void uploadSticker(userId)
      .then(() => {
        if (!cancelled) void queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      })
      .catch(() => {
        // Next launch tries again; the local copy keeps showing meanwhile.
      });
    return () => {
      cancelled = true;
    };
  }, [isGuest, profileLoaded, hasRemote, userId, queryClient]);

  return null;
}
