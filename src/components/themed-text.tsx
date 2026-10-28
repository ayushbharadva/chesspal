import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'display'
    | 'title'
    | 'headline'
    | 'subtitle'
    | 'default'
    | 'small'
    | 'smallBold'
    | 'overline'
    | 'stat';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  display: { fontFamily: Fonts.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  title: { fontFamily: Fonts.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.4 },
  headline: { fontFamily: Fonts.display, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  subtitle: { fontFamily: Fonts.semibold, fontSize: 17, lineHeight: 24, letterSpacing: -0.1 },
  default: { fontFamily: Fonts.regular, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  smallBold: { fontFamily: Fonts.semibold, fontSize: 14, lineHeight: 20 },
  overline: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  stat: { fontFamily: Fonts.display, fontSize: 40, lineHeight: 46, letterSpacing: -0.8 },
});
