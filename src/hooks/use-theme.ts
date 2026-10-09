/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, type ColorSchemeName } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useColorSchemeName(): ColorSchemeName {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  return Colors[useColorSchemeName()];
}
