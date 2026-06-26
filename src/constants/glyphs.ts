/**
 * Standardized text-glyph map. The redesign uses text glyphs (no icon-font
 * dependency this pass), so centralizing them here keeps the same concept on the
 * same glyph everywhere and makes a future icon-font migration a one-file change.
 */
export const glyphs = {
  inventory: '▦',
  sales: '▤',
  employees: '◫',
  settings: '⚙',
  search: '⌕',
  scan: '⌗',
  add: '＋',
  edit: '✎',
  sync: '↻',
  close: '✕',
  back: '←',
  chevron: '›',
  photo: '▧',
  cash: '▭',
  card: '▤',
  gcash: '◫',
  maya: '◪',
  cart: '🛒',
  business: '⌂',
  branch: '▣',
  reports: '⌘',
  audit: '⌕',
  performance: '⚑',
  lock: '🔒',
  check: '✓',
} as const;

export type GlyphName = keyof typeof glyphs;
