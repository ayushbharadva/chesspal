/**
 * Design tokens for light and dark mode. Components read colors through `useTheme()`.
 * Text and background pairs must meet WCAG AA contrast (4.5:1); theme.test.ts enforces it.
 */

export const Colors = {
  light: {
    text: '#11181C',
    textSecondary: '#5B6470',
    background: '#FFFFFF',
    surface: '#F2F4F7',
    border: '#D9DEE5',
    primary: '#0F766E',
    onPrimary: '#FFFFFF',
    streak: '#C2410C',
    boardLight: '#E7EDDD',
    boardDark: '#50745D',
    boardLastLight: '#E6D599',
    boardLastDark: '#8B8548',
    boardFocus: '#EBB949',
    boardLabelLight: '#234137',
    boardLabelDark: '#FFFFFF',
    pieceWhite: '#FFFDF2',
    pieceBlack: '#17382D',
    pieceWhiteOutline: '#234137',
    pieceBlackOutline: '#F3EBD4',
    accentSurface: '#E4F2ED',
    danger: '#A32D2D',
    modalBackdrop: '#00000099',
  },
  dark: {
    text: '#ECEDEE',
    textSecondary: '#A7AFBA',
    background: '#0E1114',
    surface: '#1A1F24',
    border: '#2C333A',
    primary: '#2DD4BF',
    onPrimary: '#04201C',
    streak: '#FB923C',
    boardLight: '#AAC0AC',
    boardDark: '#3F6150',
    boardLastLight: '#D3BF7E',
    boardLastDark: '#82733D',
    boardFocus: '#FFD06E',
    boardLabelLight: '#16352B',
    boardLabelDark: '#FFFFFF',
    pieceWhite: '#FFFDF2',
    pieceBlack: '#17382D',
    pieceWhiteOutline: '#234137',
    pieceBlackOutline: '#F3EBD4',
    accentSurface: '#173B30',
    danger: '#FFB2AB',
    modalBackdrop: '#000000AA',
  },
} as const;

export type ColorSchemeName = keyof typeof Colors;
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 8,
  medium: 12,
  large: 16,
} as const;

/** Keeps content readable on tablets; phones use the full width. */
export const MaxContentWidth = 560;
