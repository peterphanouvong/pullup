import { StyleSheet } from 'react-native-unistyles';

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
function shadowsFor(ink: string) {
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
  } as const;
}

const lightColors = {
  canvas: '#F4F5F7',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  ink: '#0B0D12',
  inkMuted: '#697080',
  accent: '#208AEF',
  onAccent: '#FFFFFF',
  done: '#30C25B',
  comp: '#E8590C',
  success: '#1F9D55',
  danger: '#C0392B',
  border: '#E3E5EA',
  gradientRecap: ['#0E2A5C', '#1D4ED8'],
  gradientEmber: ['#7A1E1E', '#C2410C'],
  // Text drawn over gradientRecap/gradientEmber — both gradients stay dark
  // navy/ember in light AND dark theme, so this is deliberately the same
  // literal in both palettes rather than flipping with onAccent.
  onGradient: '#FFFFFF',
} as const;

const darkColors = {
  canvas: '#0B0D12',
  card: '#15181E',
  cardElevated: '#1D212A',
  ink: '#F4F5F7',
  inkMuted: '#8A91A0',
  accent: '#4DA6F5',
  onAccent: '#0B0D12',
  done: '#3AD66B',
  comp: '#FF7A33',
  success: '#34C277',
  danger: '#E05B4D',
  border: '#262B33',
  gradientRecap: ['#0A1F44', '#1E40AF'],
  gradientEmber: ['#7A1E1E', '#C2410C'],
  onGradient: '#FFFFFF',
} as const;

const lightTheme = {
  ...shared,
  colors: lightColors,
  shadow: shadowsFor(lightColors.ink),
} as const;

const darkTheme = {
  ...shared,
  colors: darkColors,
  shadow: shadowsFor(darkColors.ink),
} as const;

const appThemes = { light: lightTheme, dark: darkTheme };
const breakpoints = { xs: 0 } as const;

type AppThemes = typeof appThemes;
type AppBreakpoints = typeof breakpoints;

declare module 'react-native-unistyles' {
  export interface UnistylesThemes extends AppThemes {}
  export interface UnistylesBreakpoints extends AppBreakpoints {}
}

StyleSheet.configure({
  themes: appThemes,
  breakpoints,
  settings: { adaptiveThemes: true },
});
