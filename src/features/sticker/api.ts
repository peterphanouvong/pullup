/**
 * The sticker avatar: a selfie, cut out and die-cut, that stands for you
 * across the app. Taking and cutting are here; the look is drawn by
 * `StickerCanvas`; this file also owns where the PNG lives.
 *
 * Storage has two homes. Everyone (guests included) keeps the PNG in the
 * app's documents directory, so it shows the moment it's made. Signed-in
 * accounts also upload it to the `avatars` bucket and record the public
 * URL on their profile, which is how crewmates see it (`AvatarSync` does
 * the upload once there's an account).
 */

import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { canLiftSubject, liftSubject } from '../../../modules/subject-lift';

export const STICKER_BUCKET = 'avatars';

/** Opens the front camera. Null when cancelled or when permission is
 * refused (the caller's copy explains the latter). */
export async function takeSelfie(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    cameraType: ImagePicker.CameraType.front,
    allowsEditing: false,
    quality: 0.9,
  });
  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0].uri;
}

/** The photo with the person cut out, or the photo itself where the
 * device can't do that (the sticker then gets a round crop instead). */
export async function cutOut(photoUri: string): Promise<{ uri: string; lifted: boolean }> {
  if (!canLiftSubject) return { uri: photoUri, lifted: false };
  try {
    return { uri: await liftSubject(photoUri), lifted: true };
  } catch {
    return { uri: photoUri, lifted: false };
  }
}

/** Where a user's sticker PNG lives on this device. */
export function localStickerFile(userId: string): File {
  return new File(Paths.document, `sticker-${userId}.png`);
}

/** Writes the rendered sticker (base64 PNG) for this device, returning its
 * URI with a cache-busting query so image views pick up a new one. */
export function saveLocalSticker(userId: string, base64Png: string): string {
  const file = localStickerFile(userId);
  if (file.exists) file.delete();
  file.create();
  file.write(base64Png, { encoding: 'base64' });
  return `${file.uri}?v=${Date.now()}`;
}

export function loadLocalSticker(userId: string): string | null {
  const file = localStickerFile(userId);
  return file.exists ? file.uri : null;
}

/** Uploads this device's sticker for a signed-in user and points their
 * profile at it. Returns the public URL. */
export async function uploadSticker(userId: string): Promise<string> {
  const file = localStickerFile(userId);
  const bytes = await file.bytes();
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const path = `${userId}/sticker.png`;
  const upload = await supabase.storage.from(STICKER_BUCKET).upload(path, body, {
    contentType: 'image/png',
    upsert: true,
  });
  if (upload.error) throw upload.error;
  // Versioned so a retaken sticker isn't hidden behind a cached old one.
  const url = `${supabase.storage.from(STICKER_BUCKET).getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
  const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId);
  if (error) throw error;
  return url;
}

/** Avatar URLs for a set of users (crewmates' profiles are readable). */
export async function fetchAvatars(userIds: string[]): Promise<Record<string, string | null>> {
  if (userIds.length === 0) return {};
  const { data, error } = await supabase.from('profiles').select('id, avatar_url').in('id', userIds);
  if (error) throw error;
  return Object.fromEntries((data as { id: string; avatar_url: string | null }[]).map((p) => [p.id, p.avatar_url]));
}
