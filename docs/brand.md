# Brand mark

The Pull Up mark is a P whose bowl is an arrow pulling up and out. The
source is `assets/brand/pullup-p.svg`: one path on a 500×500 canvas, the
glyph spanning roughly x 116–381 and y 79–411, centred near (248, 245).

## Colours

The background is a near-vertical gradient (170°): `#4FA3F2` at the top,
`#1E5AA8` in the middle, `#0B2B5E` at the bottom. The glyph is white; on the
flat icons it fades to `#DCEBFF` at 86% opacity toward the bottom with a soft
shadow, to echo the translucent glyph of the iOS 26 icon.

`#1E5AA8` is the brand's flat blue, used for the splash background and the
Android adaptive-icon background colour.

## Where it lives

| File | What |
| --- | --- |
| `assets/expo.icon/` | iOS 26 Icon Composer bundle: the white glyph SVG at 820pt on the automatic gradient, translucency on, neutral shadow. |
| `assets/images/icon.png` | 1024px flat icon (iOS before 26, App Store). Glyph at 95% of a 500-unit box → about 63% of the canvas. |
| `assets/images/android-icon-foreground.png` | 512px, glyph on transparent at 62% → about 41% of the canvas, inside the adaptive-icon safe zone. |
| `assets/images/android-icon-background.png` | 512px gradient. |
| `assets/images/android-icon-monochrome.png` | 432px, white glyph on transparent, same framing as the foreground. |
| `assets/images/splash-icon.png` | 304px white glyph on transparent, shown at 96pt (`app.json`). |
| `assets/images/favicon.png` | 64px flat icon for Expo web. |
| `landing/img/mark.svg` | Rounded 64-unit tile with the glyph, for the landing page header and favicon. |
| `landing/img/apple-touch-icon.png` | 180px flat icon. |

## Re-rendering

The PNGs were rendered from the SVG with headless Chrome: an HTML page the
size of the target with the gradient (or a transparent body and
`--default-background-color=00000000`), the glyph as an inline SVG sized
by percentage and nudged by `translate(0.6%, 1.8%)` to centre its visual
weight, then `--screenshot`. Any SVG rasteriser that keeps the alpha channel
does the same job.
