import { StyleSheet } from 'react-native-unistyles';

const shared = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radii: { sm: 6, md: 10, lg: 14 },
  type: {
    title: { fontSize: 20, fontWeight: '700' },
    heading: { fontSize: 17, fontWeight: '600' },
    body: { fontSize: 15, fontWeight: '400' },
    caption: { fontSize: 13, fontWeight: '400' },
  },
} as const;

const lightTheme = {
  ...shared,
  colors: {
    bg: '#FFFFFF',
    surface: '#F2F2F7',
    surfaceAlt: '#E9E9EF',
    text: '#111214',
    textMuted: '#6B6E76',
    accent: '#208AEF',
    onAccent: '#FFFFFF',
    success: '#1F9D55',
    danger: '#C0392B',
    border: '#D9D9E0',
  },
} as const;

const darkTheme = {
  ...shared,
  colors: {
    bg: '#0E0F12',
    surface: '#1A1C20',
    surfaceAlt: '#24262C',
    text: '#F3F4F6',
    textMuted: '#9CA0A8',
    accent: '#4DA6F5',
    onAccent: '#0E0F12',
    success: '#34C277',
    danger: '#E05B4D',
    border: '#32353C',
  },
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
