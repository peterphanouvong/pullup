import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSession } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { StepFrame } from '@/features/onboarding/components/step-frame';
import { path$ } from '@/features/onboarding/state';
import { cutOut, saveLocalSticker, takeSelfie } from '@/features/sticker/api';
import { StickerCanvas, type StickerCanvasHandle } from '@/features/sticker/components/sticker-canvas';
import { setLocalSticker } from '@/features/sticker/hooks';

const STICKER_SIZE = 300;

/**
 * Second step: a selfie, made into a sticker. The cutout happens on the
 * phone, the look is drawn in `StickerCanvas`, and what's saved is the
 * finished PNG. It's what crewmates see of you, so it comes right after
 * the name and before the questions. Skippable; the Profile can do it later.
 */
export default function SelfieScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const session = useSession();
  // `from=profile`: retaking from the Profile, so finishing goes back
  // there instead of on into the interview.
  const { from } = useLocalSearchParams<{ from?: string }>();
  const retaking = from === 'profile';
  function leave() {
    if (retaking) router.back();
    else router.push(path$.peek() === 'browse' ? '/onboarding/browse' : '/onboarding/1');
  }
  const canvasRef = useRef<StickerCanvasHandle>(null);
  const [cutout, setCutout] = useState<{ uri: string; lifted: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  async function snap() {
    haptics.tap();
    setBusy(true);
    try {
      const photo = await takeSelfie();
      if (photo == null) {
        setDenied(true);
        return;
      }
      setDenied(false);
      setCutout(await cutOut(photo));
      haptics.success();
    } finally {
      setBusy(false);
    }
  }

  function next() {
    haptics.tap();
    const png = canvasRef.current?.snapshot();
    if (png != null) setLocalSticker(session.user.id, saveLocalSticker(session.user.id, png));
    leave();
  }

  return (
    <StepFrame
      step={null}
      title={cutout ? 'That’s you.' : 'Now, a sticker of you.'}
      subtitle={
        cutout
          ? 'This is what your crew sees next to your name. Retake it any time from your profile.'
          : 'Take a selfie. We cut you out and make you a sticker, right here on your phone.'
      }
      cta={cutout ? (retaking ? 'Save' : 'Continue') : 'Take a selfie'}
      onCta={cutout ? next : () => void snap()}
      ctaDisabled={busy}
      secondary={cutout ? 'Retake' : retaking ? 'Cancel' : 'Skip for now'}
      onSecondary={cutout ? () => void snap() : leave}
    >
      <View style={styles.stage}>
        {cutout ? (
          <StickerCanvas ref={canvasRef} uri={cutout.uri} size={STICKER_SIZE} round={!cutout.lifted} />
        ) : (
          // The circle is the obvious thing to tap, so it does what the
          // button does.
          <Pressable
            style={({ pressed }) => [styles.placeholder, pressed && !busy && styles.placeholderPressed]}
            onPress={() => void snap()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Take a selfie"
          >
            {busy ? (
              <ActivityIndicator />
            ) : (
              <SymbolView name="camera.fill" size={40} tintColor={theme.colors.inkMuted} />
            )}
          </Pressable>
        )}
        {busy && cutout == null && <Text style={styles.hint}>Cutting you out…</Text>}
        {denied && (
          <Text style={styles.hint}>Camera access is off. You can allow it in Settings, or skip for now.</Text>
        )}
        {cutout != null && !cutout.lifted && (
          <Text style={styles.hint}>Couldn’t find a face to cut out, so here’s the round version.</Text>
        )}
      </View>
    </StepFrame>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  stage: { alignItems: 'center', gap: theme.spacing.md, paddingTop: theme.spacing.lg },
  placeholder: {
    width: STICKER_SIZE * 0.7,
    height: STICKER_SIZE * 0.7,
    borderRadius: STICKER_SIZE * 0.35,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.glassBorder,
    backgroundColor: theme.colors.glassControl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderPressed: { opacity: 0.6 },
  hint: { ...theme.type.caption, color: theme.colors.inkMuted, textAlign: 'center', maxWidth: 280 },
});
