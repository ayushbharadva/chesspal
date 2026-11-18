import { Colors } from '@/constants/theme';

// Relative luminance and contrast ratio as defined by WCAG 2.x.
function relativeLuminance(hexColor: string): number {
  const [red, green, blue] = [1, 3, 5].map((start) => {
    const channel = parseInt(hexColor.slice(start, start + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (first, second) => second - first,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

const textOnBackgroundPairs = [
  ['text', 'background'],
  ['text', 'surface'],
  ['text', 'surfaceMuted'],
  ['text', 'surfaceRaised'],
  ['text', 'accentSurface'],
  ['text', 'successSurface'],
  ['text', 'dangerSurface'],
  ['textSecondary', 'background'],
  ['textSecondary', 'surface'],
  ['textSecondary', 'surfaceMuted'],
  ['textSecondary', 'surfaceRaised'],
  ['textSecondary', 'accentSurface'],
  ['onPrimary', 'primary'],
  ['accent', 'background'],
  ['accent', 'surface'],
  ['accent', 'accentSurface'],
  ['onHero', 'hero'],
  ['onHeroSecondary', 'hero'],
  ['heroAccent', 'hero'],
  ['onHeroAccent', 'heroAccent'],
  ['success', 'surface'],
  ['success', 'successSurface'],
  ['danger', 'surface'],
  ['danger', 'dangerSurface'],
  ['streak', 'background'],
  ['streak', 'surface'],
  ['boardFrameLabel', 'boardFrame'],
  ['boardLabelLight', 'boardLight'],
  ['boardLabelDark', 'boardDark'],
  ['boardLabelLight', 'boardLastLight'],
  ['boardLabelHighlight', 'boardLastDark'],
] as const;

describe.each(['light', 'dark'] as const)('%s theme', (schemeName) => {
  const palette = Colors[schemeName];

  it.each(textOnBackgroundPairs)('%s on %s meets WCAG AA contrast (4.5:1)', (text, background) => {
    expect(contrastRatio(palette[text], palette[background])).toBeGreaterThanOrEqual(4.5);
  });
});

it('defines the same color tokens in light and dark mode', () => {
  expect(Object.keys(Colors.dark).sort()).toEqual(Object.keys(Colors.light).sort());
});
