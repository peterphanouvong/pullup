import { requireOptionalNativeModule } from 'expo';

interface SubjectLiftModule {
  liftSubject(uri: string): Promise<string>;
}

// Optional: absent in Expo Go and on Android, where callers fall back to
// the uncut photo.
const native = requireOptionalNativeModule<SubjectLiftModule>('SubjectLift');

/** Whether this binary can cut a subject out of a photo. */
export const canLiftSubject = native != null;

/**
 * Cuts the person out of a photo (file URI) and returns the file URI of a
 * transparent PNG cropped to them. Rejects when the device can't (older
 * than iOS 17, no native module) or when no one is found.
 */
export function liftSubject(uri: string): Promise<string> {
  if (native == null) return Promise.reject(new Error('Subject lifting is not available on this device'));
  return native.liftSubject(uri);
}
