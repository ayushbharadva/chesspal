# 0003: ChessPal visual design

Date: 2026-10-28. Status: accepted.

## Context

The first UI used default-looking tokens: white and grey surfaces, a teal accent, a green board and hand-drawn geometric pieces. It worked, but it read as a prototype rather than a product people would choose over Chess.com or Lichess. The rename to ChessPal ([0002](0002-chesspal-name.md)) was the moment to give the app a deliberate identity.

## Decision

**Direction: ivory, ink and brass, with a walnut board.** The palette is borrowed from a wooden club chess set, which says "chess" without copying Chess.com's green or Lichess's brown, and feels calm rather than gamified.

- **Colors** (`src/constants/theme.ts`): warm ivory background and white cards in light mode; near-black ink surfaces in dark mode. Ink is the primary action color in light mode, brass in dark mode. Brass is reserved for emphasis: streaks, progress, highlights and the main call to action on the dark hero card. Success, danger and their tinted surfaces cover feedback. Every text and background pair, including board coordinates on plain and highlighted squares, is checked for WCAG AA in `theme.test.ts`.
- **Typography:** Fraunces SemiBold for display text (titles, card headings, big numbers) and Inter for interface text. Fonts load with `useFonts` in the root layout while the splash screen stays visible; if loading fails the app falls back to system fonts. Each weight is its own family name (`Fonts` tokens); components never set `fontWeight`, which Android ignores or fakes for custom fonts. Only the five weights used are imported, through per-weight subpaths, so the bundle carries roughly 1.4 MB of fonts rather than every weight.
- **Pieces:** the Chessnut set by Alexis Luengas (Apache License 2.0), rendered with `SvgXml` from `src/components/board/piece-set.ts`. Familiar Staunton shapes help beginners recognise pieces; the original geometric pieces were hard to tell apart at small sizes.
- **Icons:** 18 Lucide glyphs (ISC License) copied into `src/components/icon.tsx` as SVG paths, so no icon font or icon library is needed.
- **Surfaces:** cards use soft layered `boxShadow` in light mode and hairline borders in dark mode (React Native's New Architecture supports `boxShadow`). The hero card draws an ink gradient and a faint checkerboard with react-native-svg.
- **Brand mark and launcher icons:** the Chessnut knight in brass on an ink tile. `assets/images/chesspal-icon.svg` is the source; the PNGs are exports.

## Consequences

- New dependencies: `expo-font`, `@expo-google-fonts/fraunces` and `@expo-google-fonts/inter`. All work in Expo Go; no native code was added.
- Third-party artwork and icons must keep their notices: `licenses/chessnut-apache-2.0.txt` and `licenses/lucide-isc.txt`. Fraunces and Inter are under the SIL Open Font License, shipped with their packages.
- Text styles, colors and elevations come from tokens. New screens should compose `Card`, `Button`, `Pill`, `ListRow`, `Segmented`, `Chip` and `IconBadge` instead of styling raw views.
- The splash screen uses the ivory background in light mode and ink in dark mode. Expo's docs recommend checking splash screens in a release build rather than Expo Go.

## Alternatives considered

- **Chess.com-style green and white:** recognisable but derivative, and visually closest to the old theme.
- **Dark-only "gaming" theme with neon accents:** fashionable, but harsher for long reading and less suited to beginners.
- **cburnett pieces (Lichess default):** excellent, but licensed GPLv2+, which is a poor fit for an app that may later be sold. Several other attractive Lichess sets are non-commercial only.
- **An icon library such as `@expo/vector-icons` or `lucide-react-native`:** more icons than needed; copying the few required paths keeps the dependency list short.
