/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useColorScheme } from 'react-native';

import { Colors, Elevation, type ColorSchemeName } from '@/constants/theme';
import { useProgressStore } from '@/progress/store';

export function useColorSchemeName(): ColorSchemeName {
  const system = useColorScheme();
  const appearance = useProgressStore((state) => state.settings.appearance);
  if (appearance !== 'system') return appearance;
  return system === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  return Colors[useColorSchemeName()];
}

export function useElevation() {
  return Elevation[useColorSchemeName()];
}
