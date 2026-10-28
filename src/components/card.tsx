import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useElevation, useTheme } from '@/hooks/use-theme';

type CardVariant = 'surface' | 'muted' | 'accent' | 'success' | 'danger' | 'hero';

const backgrounds: Record<CardVariant, ThemeColor> = {
  surface: 'surface',
  muted: 'surfaceMuted',
  accent: 'accentSurface',
  success: 'successSurface',
  danger: 'dangerSurface',
  hero: 'hero',
};

export function Card({
  children,
  variant = 'surface',
}: {
  children: ReactNode;
  variant?: CardVariant;
}) {
  const theme = useTheme();
  const elevation = useElevation();
  const hero = variant === 'hero';
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme[backgrounds[variant]] },
        variant === 'surface' && {
          borderColor: theme.border,
          borderWidth: StyleSheet.hairlineWidth,
          boxShadow: elevation.card,
        },
        hero && { boxShadow: elevation.raised },
      ]}>
      {hero && <HeroBackdrop from={theme.hero} to={theme.heroEnd} line={theme.heroAccent} />}
      {children}
    </View>
  );
}

/** A diagonal ink wash with a faint checkerboard corner, drawn behind hero content. */
function HeroBackdrop({ from, to, line }: { from: string; to: string; line: string }) {
  const squares = [0, 1, 2, 3].flatMap((row) =>
    [0, 1, 2, 3].filter((column) => (row + column) % 2 === 0).map((column) => [row, column]),
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="hero-wash" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" rx={Radius.large} fill="url(#hero-wash)" />
      </Svg>
      <Svg width={80} height={80} style={styles.pattern}>
        {squares.map(([row, column]) => (
          <Rect
            key={`${row}-${column}`}
            x={column * 20}
            y={row * 20}
            width={20}
            height={20}
            rx={3}
            fill={line}
            opacity={0.14 - row * 0.03}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    borderRadius: Radius.large,
    gap: Spacing.three,
  },
  pattern: { position: 'absolute', top: Spacing.three, right: Spacing.three },
});
