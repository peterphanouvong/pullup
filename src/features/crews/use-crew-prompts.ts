import { Alert } from 'react-native';
import { useSession } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { cleanDisplayName } from '@/features/account/api';
import { registerPush, requestPushPermission } from '@/features/notifications/push';
import { shareInvite } from './components/crew-card';
import { useCreateCrew, useJoinCrew } from './hooks';
import { normaliseInviteCode } from './week';

/** Server errors are written for people ("that crew is full"); give them a
 * capital and show them as they are. */
export function crewErrorText(e: Error): string {
  return e.message.charAt(0).toUpperCase() + e.message.slice(1) + '.';
}

/**
 * The two ways into a crew, as iOS prompts: name one and share its code,
 * or type a code in. Shared by the Crew tab and onboarding's last step so
 * the words and the follow-through (push permission, the share sheet) are
 * the same in both.
 */
export function useCrewPrompts() {
  const session = useSession();
  const createCrew = useCreateCrew();
  const joinCrew = useJoinCrew();

  /** The first crew is when pushes start meaning something, so that's
   * when we ask. */
  function offerPush() {
    void requestPushPermission().then((ok) => {
      if (ok) return registerPush(session.user.id);
    });
  }

  function promptCreate(onDone?: () => void) {
    haptics.tap();
    Alert.prompt('Name your crew', 'Your mates will see this.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Create',
        onPress: (value?: string) => {
          const name = cleanDisplayName(value ?? '');
          if (name == null) return;
          createCrew.mutate(name, {
            onSuccess: (crew) => {
              haptics.success();
              offerPush();
              // The crew is only worth something with people in it.
              shareInvite(crew.name, crew.inviteCode);
              onDone?.();
            },
            onError: (e) => Alert.alert('Couldn’t create the crew', crewErrorText(e)),
          });
        },
      },
    ]);
  }

  function promptJoin(onDone?: () => void) {
    haptics.tap();
    Alert.prompt('Join a crew', 'Enter the 6-character code from your mate.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Join',
        onPress: (value?: string) => {
          const code = normaliseInviteCode(value ?? '');
          if (code == null) {
            Alert.alert('That’s not a crew code', 'Codes are 6 letters and numbers, like K7Q2MX.');
            return;
          }
          joinCrew.mutate(code, {
            onSuccess: () => {
              haptics.success();
              offerPush();
              onDone?.();
            },
            onError: (e) => Alert.alert('Couldn’t join', crewErrorText(e)),
          });
        },
      },
    ]);
  }

  /** An invite link was opened (`pullup://join/CODE`): one tap to join,
   * since the code came from a mate rather than the keyboard. */
  function confirmJoin(rawCode: string) {
    const code = normaliseInviteCode(rawCode);
    if (code == null) return;
    haptics.tap();
    Alert.alert('Join this crew?', `Invite code ${code}.`, [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Join',
        onPress: () =>
          joinCrew.mutate(code, {
            onSuccess: () => {
              haptics.success();
              offerPush();
            },
            onError: (e) => Alert.alert('Couldn’t join', crewErrorText(e)),
          }),
      },
    ]);
  }

  return { promptCreate, promptJoin, confirmJoin, busy: createCrew.isPending || joinCrew.isPending };
}
