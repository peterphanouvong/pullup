import { StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { NativeButton } from '@/components/ui/native-button';
import { useSession } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { pushConfigured, pushPermissionGranted, registerPush, requestPushPermission } from '../push';

/** One row on the Crew tab until notifications are on: without them a
 * poke or a 🔥 never reaches you. Gone once granted; gone for good if the
 * build can't do push at all. */
export function NotificationsNudge() {
  const session = useSession();
  const styles = useThemedStyles(createStyles);
  const queryClient = useQueryClient();
  const granted = useQuery({ queryKey: ['push-permission'], queryFn: pushPermissionGranted, enabled: pushConfigured });

  if (!pushConfigured || granted.data !== false) return null;

  async function turnOn() {
    haptics.tap();
    const ok = await requestPushPermission();
    if (ok) await registerPush(session.user.id);
    await queryClient.invalidateQueries({ queryKey: ['push-permission'] });
  }

  return (
    <Card style={styles.card} glass={false}>
      <View style={styles.text}>
        <Text style={styles.title}>Hear from your crew</Text>
        <Text style={styles.body}>Get a nudge when a mate trains, reacts, or pokes you.</Text>
      </View>
      <NativeButton label="Turn on" size="regular" fullWidth={false} onPress={() => void turnOn()} />
    </Card>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  text: { flex: 1, gap: 2 },
  title: { ...theme.type.heading, color: theme.colors.ink },
  body: { ...theme.type.caption, color: theme.colors.inkMuted },
});
