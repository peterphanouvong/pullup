import { forwardRef, useImperativeHandle } from 'react';
import {
  Canvas,
  Circle,
  ColorMatrix,
  FractalNoise,
  Group,
  Image as SkiaImage,
  Mask,
  Morphology,
  Paint,
  Rect,
  Shadow,
  useCanvasRef,
  useImage,
} from '@shopify/react-native-skia';

/** Points of white around the cutout: the die-cut edge. */
const BORDER = 10;
/** Room for the border and the drop shadow inside the canvas. */
const INSET = BORDER + 14;

/** Pure white in place of the image's colour, alpha kept: the silhouette. */
const WHITE_SILHOUETTE = [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0];

/** A touch less saturation and a warm lift: a print, not a photo. */
const FILM = [
  0.92, 0.08, 0.04, 0, 0.03,
  0.05, 0.9, 0.04, 0, 0.02,
  0.04, 0.08, 0.84, 0, 0,
  0, 0, 0, 1, 0,
];

export interface StickerCanvasHandle {
  /** The rendered sticker as a base64 PNG, at the device's pixel density. */
  snapshot(): string | null;
}

/**
 * The sticker look, drawn with Skia: the cutout's silhouette dilated into
 * a white die-cut border with a soft shadow, the photo over it with a film
 * colour grade, and grain masked to the sticker. When the cutout isn't
 * available the photo gets a round crop first, so it still reads as a
 * sticker rather than a rectangle.
 */
export const StickerCanvas = forwardRef<StickerCanvasHandle, { uri: string; size: number; round?: boolean }>(
  function StickerCanvas({ uri, size, round = false }, ref) {
    const canvasRef = useCanvasRef();
    const image = useImage(uri);
    useImperativeHandle(ref, () => ({
      snapshot: () => canvasRef.current?.makeImageSnapshot()?.encodeToBase64() ?? null,
    }), [canvasRef]);

    const inner = size - 2 * INSET;
    const picture = image && (
      <SkiaImage image={image} x={INSET} y={INSET} width={inner} height={inner} fit="contain" />
    );
    // The shape the border and grain follow: the cutout itself, or a disc.
    const shape = round ? (
      <Circle cx={size / 2} cy={size / 2} r={inner / 2} color="white" />
    ) : (
      picture && (
        <SkiaImage image={image} x={INSET} y={INSET} width={inner} height={inner} fit="contain">
          <ColorMatrix matrix={WHITE_SILHOUETTE} />
        </SkiaImage>
      )
    );

    // The silhouette grown outward: the die-cut border, and the shape
    // everything is clipped to.
    const border = (
      <Group layer>
        <Morphology operator="dilate" radius={BORDER} />
        {shape}
      </Group>
    );

    return (
      <Canvas ref={canvasRef} style={{ width: size, height: size }}>
        {image && (
          <>
            {/* The shadow on its own, under everything: it falls outside
                the border, so it can't live in the clipped layer below. */}
            <Group>
              <Shadow dx={0} dy={6} blur={10} color="rgba(0, 0, 0, 0.35)" shadowOnly />
              {border}
            </Group>
            {/* The sticker itself, in one layer: border, the graded photo
                (round crop when there's no cutout), grain blended over the
                lot, then the layer clipped back to the border. The grain
                has to be clipped this way: an overlay-blended rect inside a
                `Mask` keeps its own blend mode and ignores the mask, which
                left a faint grey square over the whole canvas. */}
            <Group layer>
              {border}
              {round ? (
                <Mask mask={<Circle cx={size / 2} cy={size / 2} r={inner / 2} color="white" />}>
                  <SkiaImage image={image} x={INSET} y={INSET} width={inner} height={inner} fit="cover">
                    <ColorMatrix matrix={FILM} />
                  </SkiaImage>
                </Mask>
              ) : (
                <SkiaImage image={image} x={INSET} y={INSET} width={inner} height={inner} fit="contain">
                  <ColorMatrix matrix={FILM} />
                </SkiaImage>
              )}
              <Rect x={0} y={0} width={size} height={size} opacity={0.22} blendMode="overlay">
                <FractalNoise freqX={0.9} freqY={0.9} octaves={2} seed={7} />
              </Rect>
              <Group layer={<Paint blendMode="dstIn" />}>{border}</Group>
            </Group>
          </>
        )}
      </Canvas>
    );
  },
);
