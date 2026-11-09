import { Alert } from 'react-native';
import { router } from 'expo-router';
import { haptics } from '@/lib/haptics';
import { briefToDraft } from './questions';
import { seedOnboarding } from './state';

/**
 * "Change something" for a programme you already have, from anywhere in
 * the app: one line on what to change, then the coach rewrites that
 * instance in place with the answers it was built from. Only a
 * coach-written programme has those answers (`brief`); a template copy
 * has none, so callers hide the option when the brief is null.
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
