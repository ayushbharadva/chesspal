/**
 * ChessPal design tokens: warm ivory paper, ink and brass, with a walnut board.
 * Components read colors through `useTheme()`.
 * Text and background pairs must meet WCAG AA contrast (4.5:1); theme.test.ts enforces it.
 */

export const Colors = {
  light: {
    text: '#17181C',
    textSecondary: '#5C574E',
    background: '#F6F3EC',
    surface: '#FFFFFF',
    surfaceMuted: '#EEE9DF',
    surfaceRaised: '#FFFFFF',
    border: '#E4DCCD',
    primary: '#1B1D24',
    onPrimary: '#F8F5EE',
    accent: '#8A5F0E',
    accentFill: '#C9993F',
    accentSurface: '#F4E9D3',
    hero: '#1B1D24',
    heroEnd: '#2B2F3B',
    onHero: '#F8F5EE',
    onHeroSecondary: '#B8B2A5',
    heroAccent: '#E2B65E',
    onHeroAccent: '#1B1D24',
    heroOverlay: '#FFFFFF14',
    success: '#1A6B43',
    successSurface: '#E3F0E6',
    danger: '#AF2A1F',
    dangerSurface: '#FBE8E5',
    streak: '#B04E0A',
    boardLight: '#ECD9B9',
    boardDark: '#B3865D',
    boardLastLight: '#F0DE97',
    boardLastDark: '#D1AD5E',
    boardLabelLight: '#82552F',
    boardLabelDark: '#24170B',
    boardLabelHighlight: '#24170B',
    boardFocus: '#1B1D24',
    boardFrame: '#5B3B22',
    boardFrameLabel: '#F3E3C7',
    pieceWhite: '#FFFFFF',
    pieceBlack: '#000000',
    boardTarget: '#1B1D2440',
    boardCheck: '#C8402F8C',
    boardSuccess: '#2E9E6680',
    boardMark: '#C9993F8C',
    boardWrong: '#C8402F66',
    boardArrow: '#1A6B43CC',
    boardStar: '#7A520A',
    modalBackdrop: '#0E0F1399',
  },
  dark: {
    text: '#F2EEE6',
    textSecondary: '#A7A296',
    background: '#0E0F13',
    surface: '#17191F',
    surfaceMuted: '#21242B',
    surfaceRaised: '#30343D',
    border: '#2B2E36',
    primary: '#E2B65E',
    onPrimary: '#1A1407',
    accent: '#E2B65E',
    accentFill: '#E2B65E',
    accentSurface: '#2A2417',
    hero: '#1E2129',
    heroEnd: '#2A2618',
    onHero: '#F2EEE6',
    onHeroSecondary: '#ABA699',
    heroAccent: '#E2B65E',
    onHeroAccent: '#1A1407',
    heroOverlay: '#FFFFFF12',
    success: '#5FCB94',
    successSurface: '#13281D',
    danger: '#FF9186',
    dangerSurface: '#2F1816',
    streak: '#F29B4C',
    boardLight: '#D8C3A0',
    boardDark: '#94694A',
    boardLastLight: '#E3CF86',
    boardLastDark: '#BC984C',
    boardLabelLight: '#6B4426',
    boardLabelDark: '#FFFFFF',
    boardLabelHighlight: '#24170B',
    boardFocus: '#14151A',
    boardFrame: '#3B2818',
    boardFrameLabel: '#E6CFA8',
    pieceWhite: '#FFFFFF',
    pieceBlack: '#000000',
    boardTarget: '#14151A4D',
    boardCheck: '#D9483A99',
    boardSuccess: '#2E9E668C',
    boardMark: '#E2B65E8C',
    boardWrong: '#D9483A80',
    boardArrow: '#2E9E66D9',
    boardStar: '#5A3A06',
    modalBackdrop: '#000000B3',
  },
} as const;

export type ColorSchemeName = keyof typeof Colors;
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Soft layered shadows in light mode; dark mode separates surfaces with borders instead. */
export const Elevation = {
  light: {
    card: '0px 1px 2px rgba(27, 29, 36, 0.05), 0px 8px 24px rgba(27, 29, 36, 0.06)',
    raised: '0px 2px 4px rgba(27, 29, 36, 0.08), 0px 16px 32px rgba(27, 29, 36, 0.14)',
  },
  dark: {
    card: '0px 0px 0px rgba(0, 0, 0, 0)',
    raised: '0px 12px 32px rgba(0, 0, 0, 0.45)',
  },
} as const;

/** Font families registered in the root layout. Weights live in the family name, not `fontWeight`. */
export const Fonts = {
  display: 'Fraunces_600SemiBold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

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
  small: 10,
  medium: 14,
  large: 20,
  pill: 999,
} as const;

/** Keeps content readable on tablets; phones use the full width. */
export const MaxContentWidth = 560;
