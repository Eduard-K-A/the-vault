/**
 * Minimal / mono design language.
 *
 * Near-monochrome neutral ramp with a single restrained accent. Two palettes —
 * light and dark — share an identical key set so components can swap at runtime
 * via the theme provider. `colors` stays exported (light) for backward compat
 * with any module that reads tokens statically.
 *
 * Semantic pairs:
 *  - primary / onPrimary  → solid mono action (button bg / its text)
 *  - accent  / onAccent   → the one restrained accent (links, active states)
 *  - surface / textPrimary, etc.
 */

const lightColors = {
  // Surfaces
  background: '#FAFAFA',
  backgroundAlt: '#F4F4F5',
  surface: '#FFFFFF',
  surfaceMuted: '#F4F4F5',
  surfaceAlt: '#FAFAFA',

  // Accent (single restrained hue)
  accent: '#4F46E5',
  accentSubtle: '#EEF0FF',
  onAccent: '#FFFFFF',

  // Mono primary action
  primary: '#18181B',
  primaryDark: '#09090B',
  onPrimary: '#FFFFFF',

  // Text
  textPrimary: '#18181B',
  textSecondary: '#71717A',
  text: '#18181B',
  textMuted: '#71717A',

  // Lines
  border: '#E4E4E7',
  borderStrong: '#D4D4D8',

  // Semantic
  success: '#15803D',
  successBg: '#F0FDF4',
  successSoft: '#F0FDF4',
  warning: '#B45309',
  warningBg: '#FFFBEB',
  warningSoft: '#FFFBEB',
  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  dangerSoft: '#FEF2F2',
  info: '#4F46E5',
  accentSoft: '#EEF0FF',

  // Chips
  chipActiveBg: '#18181B',
  chipActiveText: '#FFFFFF',
  chipInactiveBg: '#FFFFFF',
  chipInactiveBorder: '#E4E4E7',
  chipInactiveText: '#71717A',

  // Effects
  shadow: 'rgba(24,24,27,0.06)',
  overlay: 'rgba(9,9,11,0.45)',
  scrim: 'rgba(9,9,11,0.45)',
} as const;

export type ThemeColors = { [K in keyof typeof lightColors]: string };

const darkColors: ThemeColors = {
  // Surfaces
  background: '#09090B',
  backgroundAlt: '#18181B',
  surface: '#18181B',
  surfaceMuted: '#27272A',
  surfaceAlt: '#111113',

  // Accent
  accent: '#818CF8',
  accentSubtle: '#20223A',
  onAccent: '#0B0B12',

  // Mono primary action — flips to light so solid buttons read on dark
  primary: '#FAFAFA',
  primaryDark: '#FFFFFF',
  onPrimary: '#18181B',

  // Text
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  text: '#FAFAFA',
  textMuted: '#A1A1AA',

  // Lines
  border: '#27272A',
  borderStrong: '#3F3F46',

  // Semantic
  success: '#4ADE80',
  successBg: '#13251A',
  successSoft: '#13251A',
  warning: '#FBBF24',
  warningBg: '#2A2113',
  warningSoft: '#2A2113',
  danger: '#F87171',
  dangerBg: '#2A1518',
  dangerSoft: '#2A1518',
  info: '#818CF8',
  accentSoft: '#20223A',

  // Chips
  chipActiveBg: '#FAFAFA',
  chipActiveText: '#18181B',
  chipInactiveBg: '#18181B',
  chipInactiveBorder: '#27272A',
  chipInactiveText: '#A1A1AA',

  // Effects
  shadow: 'rgba(0,0,0,0.40)',
  overlay: 'rgba(0,0,0,0.60)',
  scrim: 'rgba(0,0,0,0.60)',
} as const;

export const themes = { light: lightColors, dark: darkColors } as const;
export type ThemeName = keyof typeof themes;

/** Backward-compatible static export. Defaults to the light palette. */
export const colors = lightColors;
