import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, type Theme } from './theme';

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
}

/**
 * `factory` must be a stable module-level function (e.g. `const createStyles
 * = (theme: Theme) => StyleSheet.create({...})` defined outside the
 * component) — passing an inline/closure-capturing factory defeats the
 * memoization and recreates the style objects on every render.
 */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}
