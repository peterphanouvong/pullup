const shared = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radii: { sm: 6, md: 10, lg: 14, xl: 20, pill: 999 },
  type: {
    display: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
    numeralXL: {
      fontSize: 44,
      fontWeight: '800',
      // Cast away the outer `as const`'s readonly-tuple inference — RN's
      // TextStyle wants a mutable FontVariant[], not a readonly tuple.
      fontVariant: ['tabular-nums'] as ('tabular-nums')[],
    },
    title: { fontSize: 22, fontWeight: '700' },
    heading: { fontSize: 17, fontWeight: '600' },
    body: { fontSize: 15, fontWeight: '400' },
    caption: { fontSize: 13, fontWeight: '500' },
    label: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
  },
} as const;

// Shadow color is the theme's own `ink` token (per spec: "@ 8%/12% ink"), so
// it's built per-theme rather than shared — in dark mode this reads as a
// subtle light rim rather than a drop shadow, which is the intended effect.
function shadowsFor(ink: string, glowColor: string) {
  return {
    card: {
      shadowColor: ink,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 12,
      shadowOpacity: 0.08,
      elevation: 2,
    },
    float: {
      shadowColor: ink,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 24,
      shadowOpacity: 0.12,
      elevation: 6,
    },
    // A soft halo in the primary blue, centred (no offset): today's day card,
    // and (tightened) the filled segments of the week's progress bar.
    glow: {
      shadowColor: glowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 16,
      shadowOpacity: 0.55,
      elevation: 8,
    },
  } as const;
}

// Neutral near-black/greys doing all the structural work, with one primary
// blue (Peter's call, after rose-pink and an ink-black accent): primary
// buttons, exercise names and completion all share it, Hevy-style, so the
// app has a single colour that means "act here / this is done".
const lightColors = {
  canvas: '#F5F5F5',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  ink: '#111111',
  inkMuted: '#707072',
  accent: '#1F6FEB',
  onAccent: '#FFFFFF',
  done: '#1F6FEB',
  comp: '#E8590C',
  success: '#1F9D55',
  danger: '#C0392B',
  border: '#E6E6E6',
  // `done` @ ~14% alpha flattened over `card` (solid, not actual alpha — see
  // darkColors.doneSoft for why these are precomputed instead of using RN's
  // rgba()): the active-workout set row's "completed" fill.
  doneSoft: '#E0EBFC',
  // Translucent card fill + hairline edge: the "liquid glass" card look —
  // a lifted sheet over the canvas rather than a flat opaque panel.
  glass: 'rgba(255, 255, 255, 0.72)',
  glassBorder: 'rgba(17, 17, 17, 0.08)',
  // Round controls sitting on a glass surface (the minimized workout bar's
  // buttons): a faint translucent chip, so they stay part of the glass
  // instead of punching opaque holes in it.
  glassControl: 'rgba(17, 17, 17, 0.06)',
  // Fill for the tonal NativeButton (Add Set): fed to the glass prominent
  // style as its tint, so it stays a real Liquid Glass capsule but reads a
  // step lighter than the card instead of the primary blue.
  tonalFill: 'rgba(17, 17, 17, 0.08)',
  // `glass` flattened over `canvas`. Rows that must be opaque (a swipeable
  // row has to hide the delete action sitting behind it) use this so they
  // disappear into the card instead of reading as a lighter patch.
  glassSolid: '#FCFCFC',
  // Completed-set row wash: `done` at low alpha so the row lifts without
  // becoming a slab of colour.
  doneRow: 'rgba(31, 111, 235, 0.10)',
  // A completed set's number chip: `done` stronger than the row wash it sits
  // on, so the chip still reads as a chip instead of vanishing into it.
  doneChip: 'rgba(31, 111, 235, 0.22)',
  // The set row being edited: a touch lighter than its neighbours, with a
  // hairline edge, so the active row is obvious without shouting.
  activeRow: 'rgba(17, 17, 17, 0.07)',
  activeRowBorder: 'rgba(17, 17, 17, 0.45)',
  gradientRecap: ['#0E2A5C', '#1D4ED8'],
  gradientEmber: ['#7A1E1E', '#C2410C'],
  // Text drawn over gradientRecap/gradientEmber — both gradients stay dark
  // navy/ember in light AND dark theme, so this is deliberately the same
  // literal in both palettes rather than flipping with onAccent.
  onGradient: '#FFFFFF',
} as const;

const darkColors = {
  canvas: '#0B0B0C',
  card: '#1A1A1C',
  cardElevated: '#242426',
  ink: '#F5F5F5',
  inkMuted: '#8E8E93',
  accent: '#3D8BF7',
  onAccent: '#FFFFFF',
  done: '#3D8BF7',
  comp: '#FF7A33',
  success: '#34C277',
  danger: '#E05B4D',
  border: '#2C2C2E',
  // `done` @ ~14% alpha flattened over `card`, same rationale as the light
  // theme's doneSoft — precomputed solid color, no RN rgba() call needed.
  doneSoft: '#1F2A3B',
  glass: 'rgba(40, 40, 43, 0.72)',
  glassBorder: 'rgba(255, 255, 255, 0.10)',
  glassControl: 'rgba(255, 255, 255, 0.10)',
  tonalFill: 'rgba(255, 255, 255, 0.14)',
  glassSolid: '#202022',
  doneRow: 'rgba(61, 139, 247, 0.16)',
  doneChip: 'rgba(61, 139, 247, 0.30)',
  activeRow: 'rgba(255, 255, 255, 0.10)',
  activeRowBorder: 'rgba(255, 255, 255, 0.55)',
  gradientRecap: ['#0A1F44', '#1E40AF'],
  gradientEmber: ['#7A1E1E', '#C2410C'],
  onGradient: '#FFFFFF',
} as const;

// Widen each theme's color literals (e.g. '#0B0D12') to `string` so
// `darkTheme` structurally satisfies the same `Theme` type as `lightTheme` —
// without this, TS would infer each theme's own literal-string types and
// reject assigning one theme where the other is expected.
type ThemeColors = { [K in keyof typeof lightColors]: (typeof lightColors)[K] extends readonly [string, string]
  ? readonly [string, string]
  : string };

export interface Theme {
  spacing: typeof shared.spacing;
  radii: typeof shared.radii;
  type: typeof shared.type;
  colors: ThemeColors;
  shadow: ReturnType<typeof shadowsFor>;
}

export const lightTheme: Theme = {
  ...shared,
  colors: lightColors,
  shadow: shadowsFor(lightColors.ink, lightColors.accent),
};

export const darkTheme: Theme = {
  ...shared,
  colors: darkColors,
  shadow: shadowsFor(darkColors.ink, darkColors.accent),
};
