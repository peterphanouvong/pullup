/**
 * Page backdrops: one shader, several "vibes".
 *
 * Every screen sits on a slow, grainy colour field — Paper Design's Grain
 * Gradient (blob shape), ported from their GLSL to Skia's SkSL — in a
 * palette that shifts by page, so the Programme, Crew and Profile tabs
 * each have a mood of their own while staying one family (green, glowing,
 * textured). Content stays on glass above it.
 *
 * The numbers here are defaults. The Vibe Lab screen (`/vibe-lab`) edits
 * them live on the device and persists the result; `store.ts` owns that.
 */

export type Vibe = 'programme' | 'crew' | 'profile' | 'workout' | 'celebration';

export const VIBES: Vibe[] = ['programme', 'crew', 'profile', 'workout', 'celebration'];

export const VIBE_LABELS: Record<Vibe, string> = {
  programme: 'Program',
  crew: 'Crew',
  profile: 'Profile',
  workout: 'Workout',
  celebration: 'Finish',
};

/** `wave`: Paper's rolling sine horizon. `top`: light falling from the top
 * edge into black. `blob`: Paper's drifting soft sources. */
export type VibeShape = 'wave' | 'top' | 'blob';

export interface VibeSettings {
  shape: VibeShape;
  /** Base colour the field sits on; keep it dark so ink stays readable. */
  back: string;
  /** 1–4 gradient colours, dark to bright. */
  colors: string[];
  /** 0–1: the colours' opacity. The main "dial it up / down". */
  glow: number;
  /** 0–1: band edges, hard to smooth. */
  softness: number;
  /** 0–1: grainy distortion between bands. */
  intensity: number;
  /** 0–1: grain overlay. */
  noise: number;
  /** `top` only: how far down the screen the light reaches, as a fraction
   * of its height. */
  fade: number;
  /** Zoom of the field; bigger is calmer. (Not used by `top`.) */
  scale: number;
  /** Rotation of the field in degrees. */
  rotation: number;
  /** 0–1: how much the light moves. The top edge undulates with slow noise
   * and Paper's drifting blobs are blended into the lit area. 0 is still. */
  motion: number;
  /** Speed of that movement. */
  speed: number;
  /** 0–1: how much the field follows the scroll. 0 holds it still against
   * the window; 1 scrolls with the content. */
  parallax: number;
  offsetX: number;
  offsetY: number;
}

/** Bump whenever DEFAULT_VIBES changes: saved tunings are kept per version,
 * so new defaults show up instead of hiding behind an old save. */
export const DEFAULTS_VERSION = 3;

export const DEFAULT_VIBES: Record<Vibe, VibeSettings> = {
  // Peter's dials from Paper's Grain Gradient playground (wave shape),
  // with the light above the horizon and a blue family, one hue per page.
  // Electric blue: the house look.
  programme: {
    shape: 'wave',
    back: '#000A0F',
    colors: ['#0A1F5C', '#1E4FD8', '#3B7BFF'],
    glow: 1,
    softness: 0.47,
    intensity: 0.2,
    noise: 0.42,
    fade: 0.6,
    motion: 0.5,
    scale: 1.96,
    rotation: 8,
    speed: 0.42,
    parallax: 0.3,
    offsetX: -0.22,
    offsetY: -0.3,
  },
  // Towards cyan, mirrored so the two tabs read as a pair.
  crew: {
    shape: 'wave',
    back: '#000A0F',
    colors: ['#072A4A', '#0E6BA8', '#38B6FF'],
    glow: 1,
    softness: 0.47,
    intensity: 0.2,
    noise: 0.42,
    fade: 0.6,
    motion: 0.5,
    scale: 1.96,
    rotation: -8,
    speed: 0.42,
    parallax: 0.3,
    offsetX: 0.22,
    offsetY: -0.3,
  },
  // Indigo: you.
  profile: {
    shape: 'wave',
    back: '#000A0F',
    colors: ['#1A1550', '#4338CA', '#7C6BFF'],
    glow: 1,
    softness: 0.47,
    intensity: 0.2,
    noise: 0.42,
    fade: 0.6,
    motion: 0.5,
    scale: 1.96,
    rotation: 8,
    speed: 0.42,
    parallax: 0.3,
    offsetX: -0.22,
    offsetY: -0.3,
  },
  // Dimmer and slower while logging: the set tables are the point.
  workout: {
    shape: 'wave',
    back: '#000A0F',
    colors: ['#07163F', '#13348F'],
    glow: 0.7,
    softness: 0.47,
    intensity: 0.2,
    noise: 0.42,
    fade: 0.6,
    motion: 0.5,
    scale: 1.96,
    rotation: 8,
    speed: 0.3,
    parallax: 0.3,
    offsetX: -0.22,
    offsetY: -0.3,
  },
  // Brighter and livelier for the finish.
  celebration: {
    shape: 'wave',
    back: '#000A0F',
    colors: ['#0A1F5C', '#2563EB', '#60A5FA'],
    glow: 1,
    softness: 0.47,
    intensity: 0.2,
    noise: 0.42,
    fade: 0.6,
    motion: 0.5,
    scale: 1.96,
    rotation: 8,
    speed: 0.6,
    parallax: 0.3,
    offsetX: -0.22,
    offsetY: -0.3,
  },
};

/** Up to this many gradient colours; the shader has a slot per colour. */
export const MAX_COLORS = 4;

/** `#rgb`, `#rrggbb` or `#rrggbbaa` → [r, g, b, a] in 0–1. */
export function hexToRgba(hex: string, alpha = 1): [number, number, number, number] {
  'worklet';
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n) || (h.length !== 6 && h.length !== 8)) return [0, 0, 0, alpha];
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a * alpha];
}

/**
 * Paper Design's Grain Gradient, blob shape, in SkSL.
 *
 * Changes from the GLSL original: the vertex-stage UVs are derived from
 * `fragCoord` here; the noise texture is replaced by a procedural hash;
 * `fwidth` (no derivatives in runtime effects) becomes a small constant;
 * and the colour array is four fixed slots, since the ES2-style restrictions
 * on dynamic indexing make an array uniform awkward.
 */
export const GRAIN_GRADIENT_SKSL = `
uniform float2 u_resolution;
uniform float u_pixelRatio;
uniform float u_time;
uniform float u_scale;
uniform float2 u_offset;
uniform float u_softness;
uniform float u_intensity;
uniform float u_noise;
uniform float u_shape;
uniform float u_fade;
uniform float u_motion;
uniform float u_rotation;
uniform float u_colorsCount;
uniform float4 u_colorBack;
uniform float4 u_c0;
uniform float4 u_c1;
uniform float4 u_c2;
uniform float4 u_c3;

float2 rotate(float2 uv, float th) {
  return float2x2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}

float hash21(float2 p) {
  p = fract(p * float2(0.3183099, 0.3678794)) + 0.1;
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}

float randomR(float2 p) {
  return hash21(floor(p));
}

float3 permute(float3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(float2 v) {
  const float4 C = float4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  float2 i = floor(v + dot(v, C.yy));
  float2 x0 = v - i + dot(i, C.xx);
  float2 i1 = (x0.x > x0.y) ? float2(1.0, 0.0) : float2(0.0, 1.0);
  float4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  float3 p = permute(permute(i.y + float3(0.0, i1.y, 1.0)) + i.x + float3(0.0, i1.x, 1.0));
  float3 m = max(0.5 - float3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  float3 x = 2.0 * fract(p * C.www) - 1.0;
  float3 h = abs(x) - 0.5;
  float3 ox = floor(x + 0.5);
  float3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  float3 g = float3(0.0);
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float valueNoiseR(float2 st) {
  float2 i = floor(st);
  float2 f = fract(st);
  float a = randomR(i);
  float b = randomR(i + float2(1.0, 0.0));
  float c = randomR(i + float2(0.0, 1.0));
  float d = randomR(i + float2(1.0, 1.0));
  float2 u = f * f * (3.0 - 2.0 * f);
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}

float4 fbmR(float2 n0, float2 n1, float2 n2, float2 n3) {
  float amplitude = 0.2;
  float4 total = float4(0.0);
  for (int i = 0; i < 3; i++) {
    n0 = rotate(n0, 0.3);
    n1 = rotate(n1, 0.3);
    n2 = rotate(n2, 0.3);
    n3 = rotate(n3, 0.3);
    total.x += valueNoiseR(n0) * amplitude;
    total.y += valueNoiseR(n1) * amplitude;
    total.z += valueNoiseR(n2) * amplitude;
    total.z += valueNoiseR(n3) * amplitude;
    n0 *= 1.99;
    n1 *= 1.99;
    n2 *= 1.99;
    n3 *= 1.99;
    amplitude *= 0.6;
  }
  return total;
}

// Paper's blob: four soft sources drifting on their own paths.
float blobField(float2 uv, float t) {
  float2 f1 = 0.25 * float2(1.3 * sin(t), 0.2 + 1.3 * cos(0.6 * t + 4.0));
  float2 f2 = 0.2 * float2(1.2 * sin(-t), 1.3 * sin(1.6 * t));
  float2 f3 = 0.25 * float2(1.7 * cos(-0.6 * t), cos(-1.6 * t));
  float2 f4 = 0.3 * float2(1.4 * cos(0.8 * t), 1.2 * sin(-0.6 * t - 3.0));
  float shape = 0.5 * pow(1.0 - clamp(length(uv + f1), 0.0, 1.0), 5.0);
  shape += 0.5 * pow(1.0 - clamp(length(uv + f2), 0.0, 1.0), 5.0);
  shape += 0.5 * pow(1.0 - clamp(length(uv + f3), 0.0, 1.0), 5.0);
  shape += 0.5 * pow(1.0 - clamp(length(uv + f4), 0.0, 1.0), 5.0);
  return smoothstep(0.0, 0.9, shape);
}

float4 band(float4 gradient, float4 c, float idx, float mixer, float aa) {
  float localT = clamp(mixer - (idx - 1.0), 0.0, 1.0);
  localT = smoothstep(0.5 - 0.5 * u_softness - aa, 0.5 + 0.5 * u_softness + aa, localT);
  c.rgb *= c.a;
  return mix(gradient, c, localT);
}

half4 main(float2 fragCoord) {
  float t = 0.1 * (u_time + 7.0);
  float2 res = u_resolution;
  float rot = u_rotation * 3.14159265358979323846 / 180.0;
  float2 uv = (fragCoord - 0.5 * res) / (0.5 * min(res.x, res.y));
  float2 shape_uv = float2(0.0);
  float2 grain_uv = float2(0.0);
  if (u_shape > 1.5) {
    // Paper's pattern sizing (fit none): centred, y up, offset as a share
    // of the box, then to points, zoomed, rotated, and down by a hundred.
    float2 p = float2(fragCoord.x / res.x - 0.5, 0.5 - fragCoord.y / res.y);
    p += float2(-u_offset.x, u_offset.y);
    p *= res;
    p /= u_scale;
    p = rotate(p, rot);
    p *= 0.01;
    shape_uv = 0.5 * p;
    grain_uv = (fragCoord - 0.5 * res) * 1.6;
  } else {
    // Paper's object sizing: the short axis spans -1..1.
    shape_uv = rotate(uv * u_scale + u_offset, rot);
    grain_uv = fragCoord * u_pixelRatio * 0.7;
  }

  float shape = 0.0;
  if (u_shape > 1.5) {
    // Wave: a rolling horizon. Paper colours below it; here the light is
    // above (the sky, not the sea), so the sign of y is flipped.
    float wave = cos(0.5 * shape_uv.x - 4.0 * t) * sin(1.5 * shape_uv.x + 2.0 * t) * (0.75 + 0.25 * cos(6.0 * t));
    shape = 1.0 - smoothstep(-1.0, 1.0, -shape_uv.y + wave);
  } else if (u_shape < 0.5) {
    // Top light: full at the top edge, gone by u_fade of the height. Shift
    // Y moves where it starts. Motion makes the edge undulate with slow
    // noise and lets Paper's blobs drift through the lit part.
    float y = fragCoord.y / res.y - 0.5 * u_offset.y;
    float wobble = u_motion * 0.12 * snoise(float2(uv.x * 1.2 + 0.25 * t, 0.35 * t));
    float top = 1.0 - smoothstep(0.0, max(u_fade, 0.05), y + wobble);
    top = top * top * (3.0 - 2.0 * top);
    float drift = blobField(shape_uv * 1.3 + float2(0.0, 0.4), t);
    shape = clamp(top + u_motion * 0.5 * drift * (0.3 + 0.7 * top), 0.0, 1.0);
  } else {
    shape = blobField(shape_uv, 2.0 * t);
    float edge = smoothstep(0.25, 0.3, shape);
    shape = mix(0.0, shape, edge);
  }

  float baseNoise = snoise(grain_uv * 0.5);
  float4 fbmVals = fbmR(0.002 * grain_uv + 10.0, 0.003 * grain_uv, 0.001 * grain_uv, rotate(0.4 * grain_uv, 2.0));
  float grainDist = baseNoise * snoise(grain_uv * 0.2) - fbmVals.x - fbmVals.y;
  float rawNoise = 0.75 * baseNoise - fbmVals.w - fbmVals.z;
  float noise = clamp(rawNoise, 0.0, 1.0);

  shape += u_intensity * 2.0 / u_colorsCount * (grainDist + 0.5);
  shape += u_noise * 10.0 / u_colorsCount * noise;

  float aa = 0.004;
  shape = clamp(shape - 0.5 / u_colorsCount, 0.0, 1.0);
  float totalShape = smoothstep(0.0, u_softness + 2.0 * aa, clamp(shape * u_colorsCount, 0.0, 1.0));
  float mixer = shape * (u_colorsCount - 1.0);

  float4 gradient = u_c0;
  gradient.rgb *= gradient.a;
  if (u_colorsCount > 1.5) gradient = band(gradient, u_c1, 1.0, mixer, aa);
  if (u_colorsCount > 2.5) gradient = band(gradient, u_c2, 2.0, mixer, aa);
  if (u_colorsCount > 3.5) gradient = band(gradient, u_c3, 3.0, mixer, aa);

  float3 color = gradient.rgb * totalShape;
  float opacity = gradient.a * totalShape;
  float3 bg = u_colorBack.rgb * u_colorBack.a;
  color = color + bg * (1.0 - opacity);
  opacity = opacity + u_colorBack.a * (1.0 - opacity);
  return half4(half3(color), half(opacity));
}
`;

export interface VibeUniforms {
  /** Skia wants an indexable record; every field below fits this. */
  [uniform: string]: number | number[];
  u_resolution: [number, number];
  u_pixelRatio: number;
  u_time: number;
  u_scale: number;
  u_offset: [number, number];
  u_softness: number;
  u_intensity: number;
  u_noise: number;
  u_shape: number;
  u_fade: number;
  u_motion: number;
  u_rotation: number;
  u_colorsCount: number;
  u_colorBack: [number, number, number, number];
  u_c0: [number, number, number, number];
  u_c1: [number, number, number, number];
  u_c2: [number, number, number, number];
  u_c3: [number, number, number, number];
}

/** The shader's inputs for a vibe at a canvas size, at `time` seconds.
 * A worklet: the animated backdrop calls it per frame on the UI thread. */
export function vibeUniforms(
  s: VibeSettings,
  width: number,
  height: number,
  pixelRatio: number,
  time = 0,
): VibeUniforms {
  'worklet';
  const colors = s.colors.slice(0, MAX_COLORS);
  const slot = (i: number): [number, number, number, number] =>
    colors[i] != null ? hexToRgba(colors[i], s.glow) : [0, 0, 0, 0];
  return {
    u_resolution: [width, height],
    u_pixelRatio: pixelRatio,
    u_time: time,
    u_scale: s.scale,
    u_offset: [s.offsetX, s.offsetY],
    u_softness: s.softness,
    u_intensity: s.intensity,
    u_noise: s.noise,
    u_shape: s.shape === 'wave' ? 2 : s.shape === 'blob' ? 1 : 0,
    u_fade: s.fade,
    u_motion: s.motion,
    u_rotation: s.rotation,
    u_colorsCount: Math.max(1, colors.length),
    u_colorBack: hexToRgba(s.back),
    u_c0: slot(0),
    u_c1: slot(1),
    u_c2: slot(2),
    u_c3: slot(3),
  };
}
