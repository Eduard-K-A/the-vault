import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { themes, type ThemeColors, type ThemeName } from '@/constants/colors';
import { useThemeStore } from '@/store/themeStore';

interface ThemeContextValue {
  colors: ThemeColors;
  scheme: ThemeName;
}

const ThemeContext = createContext<ThemeContextValue>({ colors: themes.light, scheme: 'light' });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const mode = useThemeStore((state) => state.mode);

  const scheme: ThemeName = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  const value = useMemo<ThemeContextValue>(() => ({ colors: themes[scheme], scheme }), [scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Active theme palette. Re-renders consumers when the scheme changes. */
export function useTheme(): ThemeColors {
  return useContext(ThemeContext).colors;
}

/** Active scheme name ('light' | 'dark'). */
export function useScheme(): ThemeName {
  return useContext(ThemeContext).scheme;
}

/**
 * Memoized themed StyleSheet. Pass a factory that builds styles from the
 * active palette; styles recompute only when the theme changes.
 *
 *   const styles = useThemedStyles(createStyles);
 *   const createStyles = (c: ThemeColors) => StyleSheet.create({ ... });
 */
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors, scheme } = useContext(ThemeContext);
  return useMemo(() => factory(colors), [factory, colors, scheme]);
}
