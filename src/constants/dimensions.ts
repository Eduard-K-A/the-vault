export const dimensions = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 20,
  radius2xl: 26,
  radiusFull: 9999,
  screenPaddingH: 18,
  screenPaddingV: 16,
  cardPadding: 18,
  cardGap: 12,
  chipGap: 8,
  sectionGap: 28,
  buttonHeight: 52,
  inputHeight: 48,
  chipHeight: 32,
  rowHeight: 64,
  headerHeight: 56,
  tabBarHeight: 60,
  stickyFooterHeight: 84,
  sheetHandleWidth: 36,
  sheetHandleHeight: 4,
  cardBorderWidth: 0.5,
  touchTarget: 48,
} as const;

/**
 * Shared elevation system. Each token bundles the iOS shadow quartet with the
 * Android `elevation` so depth reads identically across platforms. Shadow color
 * is expected to be a pre-baked alpha (e.g. `colors.shadow`), so `shadowOpacity`
 * stays at 1. Screens should consume these instead of hand-rolling shadows.
 *
 * - resting: default cards, list rows, search field
 * - raised:  FAB, toast, sticky footers, active payment chip
 * - overlay: bottom sheets, dialogs
 */
export const elevation = {
  resting: {
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  raised: {
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  overlay: {
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
} as const;
