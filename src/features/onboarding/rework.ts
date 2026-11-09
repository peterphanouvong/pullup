import { Alert } from 'react-native';
import { router } from 'expo-router';
import { haptics } from '@/lib/haptics';
import { briefToDraft } from './questions';
import { seedOnboarding } from './state';

/**
 * "Change something" for a programme you already have, from anywhere in
 * the app: one line on what to change, then the coach rewrites that
 * instance in place with the answers it was built from. Only a
 * coach-written programme has those answers (`brief`); for a template copy
 * `promptReworkOrBuild` explains and offers the interview instead.
 *
 * The onboarding reveal has its own copy of this prompt: there the
 * answers are already in the draft and the result shows on the reveal.
 * From here the build returns to the Program tab (`from=program`).
 */
export function promptRework(programId: string, brief: unknown): void {
  haptics.tap();
  Alert.prompt(
    'What should change?',
    'One line is plenty: “no Friday sessions”, “swap squats for leg press”, “make it an upper/lower split”.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Rework',
        onPress: (value?: string) => {
          const note = value?.trim() ?? '';
          if (note.length === 0) return;
          seedOnboarding(briefToDraft(brief));
          router.push({ pathname: '/onboarding/building', params: { note, programId, from: 'program' } });
        },
      },
    ],
  );
}

/**
 * The entry point screens use. The option is always there for an active
 * programme, so it's never a mystery where it went: with saved answers it
 * asks what to change; without them (a catalogue programme, or one from
 * before answers were kept) it says so and offers to build one. `brief`
 * is `undefined` while still loading.
 */
export function promptReworkOrBuild(programId: string, brief: unknown): void {
  if (brief === undefined) {
    haptics.tap();
    Alert.alert('One moment', 'Still loading your program’s details. Try again in a second.');
    return;
  }
  if (brief === null) {
    haptics.tap();
    Alert.alert(
      'Nothing to rewrite from',
      'This program came from the catalogue, so the coach has no answers to work from. Build your own and you can change it any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Build my program', onPress: () => router.push('/onboarding/1') },
      ],
    );
    return;
  }
  promptRework(programId, brief);
}
