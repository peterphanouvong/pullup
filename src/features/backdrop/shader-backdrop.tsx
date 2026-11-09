import { PixelRatio, StyleSheet, View } from 'react-native';
import { Canvas, Fill, Shader, Skia, useClock } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import { useVibe } from './store';
import { GRAIN_GRADIENT_SKSL, vibeUniforms, type Vibe, type VibeSettings } from './vibes';

// Compiled once for the app. A null here is a shader compile error; Skia
// logs the reason, and the backdrop falls back to the vibe's base colour.
const effect = Skia.RuntimeEffect.Make(GRAIN_GRADIENT_SKSL);
if (effect == null) console.error('[backdrop] grain gradient shader failed to compile');

/**
 * The colour field behind a page, drawn with Skia at the given size. Reads
 * its settings live from the vibe store, so the Vibe Lab's sliders show up
 * everywhere as they move.
 *
 * Still unless asked: a static shader costs nothing after its first paint.
 * `animated` moves it at the vibe's speed, re-rendering every frame at
 * device resolution; the finish screen is the only page that asks.
 */
export function ShaderBackdrop({
  vibe,
  width,
  height,
  animated = false,
}: {
  vibe: Vibe;
  width: number;
  height: number;
  animated?: boolean;
}) {
  const settings = useVibe(vibe);
  if (effect == null) {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: settings.back }]} />;
  }
  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Fill>
        {animated ? (
          // A copy, never the store's own object: a worklet freezes what it
          // captures, and the Vibe Lab's next slider move writes into it.
          <LiveShader settings={{ ...settings, colors: [...settings.colors] }} width={width} height={height} />
        ) : (
          <Shader source={effect} uniforms={vibeUniforms(settings, width, height, PixelRatio.get())} />
        )}
      </Fill>
    </Canvas>
  );
}

/** The animated variant keeps the clock out of the static one, so a still
 * backdrop never re-renders per frame. */
function LiveShader({ settings, width, height }: { settings: VibeSettings; width: number; height: number }) {
  const clock = useClock();
  const pixelRatio = PixelRatio.get();
  const uniforms = useDerivedValue(
    () => vibeUniforms(settings, width, height, pixelRatio, (clock.get() / 1000) * settings.speed),
    [settings, width, height, pixelRatio],
  );
  return <Shader source={effect!} uniforms={uniforms} />;
}
