import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';

/**
 * Push registration. A token is one device; it's stored against the
 * signed-in user and removed on sign-out, so the next person on this phone
 * never gets the last one's crew.
 *
 * Expo's push service needs the EAS project id (`extra.eas.projectId` in
 * app.json, written by `eas init`). Without it there's no token to register,
 * and everything here quietly does nothing.
 */

const projectId: string | undefined =
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

export const pushConfigured = Platform.OS !== 'web' && projectId != null;

// Foreground pushes show as banners too: a reaction landing while you're
// in the app is still worth a glance.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function pushPermissionGranted(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/** Asks the system prompt. Resolves to whether we may send. */
export async function requestPushPermission(): Promise<boolean> {
  if (!pushConfigured) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

let registeredToken: string | null = null;

/** Stores this device's token for `userId`, if permission is granted. */
export async function registerPush(userId: string): Promise<void> {
  if (!pushConfigured || !(await pushPermissionGranted())) return;
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { error } = await supabase
      .from('push_tokens')
      .upsert({ token, user_id: userId, platform: Platform.OS === 'ios' ? 'ios' : 'android' }, { onConflict: 'token' });
    if (error) throw error;
    registeredToken = token;
  } catch (e) {
    console.warn('push registration failed', e);
  }
}

/** Forgets this device's token: call before signing out. */
export async function unregisterPush(): Promise<void> {
  if (registeredToken == null) return;
  await supabase.from('push_tokens').delete().eq('token', registeredToken);
  registeredToken = null;
}

/** The device's IANA zone, for weeks and the Sunday recap in local time. */
export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
