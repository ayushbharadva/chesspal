/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useColorScheme } from 'react-native';

import { Colors, type ColorSchemeName } from '@/constants/theme';

export function useColorSchemeName(): ColorSchemeName {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  return Colors[useColorSchemeName()];
}
