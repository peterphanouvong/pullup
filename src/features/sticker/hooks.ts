import { useEffect } from 'react';
import { observable } from '@legendapp/state';
import { useSelector } from '@legendapp/state/react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth';
import { useProfile } from '@/features/account/hooks';
import { fetchAvatars, loadLocalSticker, localStickerFile, uploadSticker } from './api';

/** Each user's sticker on this device, by id; `undefined` until checked. */
const localSticker$ = observable<Record<string, string | null | undefined>>({});

/** Remembers a freshly rendered sticker so every screen updates at once. */
export function setLocalSticker(userId: string, uri: string): void {
  localSticker$[userId].set(uri);
}

/**
 * The sticker a guest made on this phone, carried over to the account
 * they then switched to. Stickers are filed by user id, so without this a
 * sticker taken during onboarding is orphaned the moment the sign-in
 * turns out to be an existing account: the account never shows it and
 * never uploads it. The one just taken is the newest, so it goes up
 * even if the account had one from before.
 */
export async function adoptSticker(fromUserId: string, toUserId: string, queryClient: QueryClient): Promise<void> {
  if (fromUserId === toUserId) return;
  const from = localStickerFile(fromUserId);
  if (!from.exists) return;
  const to = localStickerFile(toUserId);
  if (to.exists) to.delete();
  from.copy(to);
  setLocalSticker(toUserId, `${to.uri}?v=${Date.now()}`);
  try {
    await uploadSticker(toUserId);
    await queryClient.invalidateQueries({ queryKey: ['profile', toUserId] });
  } catch (e) {
    // The local copy shows meanwhile; AvatarSync retries next launch.
    console.warn('[avatar] upload after switching accounts:', e);
  }
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
      .catch((e: unknown) => {
        // Next launch tries again; the local copy keeps showing meanwhile.
        console.warn('[avatar] upload:', e);
      });
    return () => {
      cancelled = true;
    };
  }, [isGuest, profileLoaded, hasRemote, userId, queryClient]);

  return null;
}
