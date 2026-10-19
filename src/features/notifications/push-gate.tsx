import { useEffect } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { deviceTimezone, pushConfigured, registerPush } from './push';

/**
 * Keeps this device registered for the signed-in user and opens what a
 * tapped notification points at. Renders nothing.
 *
 * Guests aren't registered: a push is about your crew, and a guest has
 * none. The timezone is kept current on the profile for the same reason,
 * so server-side weeks match the ones on the phone.
 */
export function PushGate() {
  const session = useSession();
  const userId = session.user.id;
  const isGuest = session.user.is_anonymous ?? false;

  useEffect(() => {
    if (isGuest) return;
    void registerPush(userId);
    void supabase.from('profiles').update({ timezone: deviceTimezone() }).eq('id', userId);
  }, [userId, isGuest]);

  useEffect(() => {
    if (!pushConfigured) return;
    const open = (response: Notifications.NotificationResponse | null) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as never);
    };
    void Notifications.getLastNotificationResponseAsync().then(open);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);

  return null;
}
