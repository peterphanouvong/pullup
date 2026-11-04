import { Alert } from 'react-native';
import { haptics } from '@/lib/haptics';
import { cleanDisplayName } from './api';

export function showError(e: unknown) {
  Alert.alert('Something went wrong', e instanceof Error ? e.message : 'Please try again.');
}

/** Asks for the name crews will see. iOS-only (`Alert.prompt`), like the
 * rest of the app's chrome. Resolves once saved or dismissed. */
export function promptForName(defaultValue: string, onSave: (name: string) => Promise<void>) {
  Alert.prompt(
    'Your name',
    'This is what your crew will see.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save',
        onPress: (value?: string) => {
          const name = cleanDisplayName(value ?? '');
          if (name == null) return;
          onSave(name).then(() => haptics.select(), showError);
        },
      },
    ],
    'plain-text',
    defaultValue,
  );
}
