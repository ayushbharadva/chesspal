# 0009: Premium piece sets, chosen in Settings

Date: 2026-11-03. Status: accepted. Supersedes the piece choice in [decision 0003](0003-design-system.md).

## Context

The owner found the Chessnut pieces did not look premium, and asked for a better set and for players to choose their own in Settings. Decision 0003 had already ruled out the Lichess default (cburnett, GPLv2+) and the many non-commercial sets, since the app may be sold later.

## Research

All 41 sets in the Lichess repository were checked against its licence list, along with sets outside Lichess. The most polished sets (Staunty, Maestro, Cardinal, Gioco and the rest by sadsnake1, plus California, Caliente, Cooke and Monarchy) are CC BY-NC-SA, so commercial use is not allowed. Merida, Mono, Mpchess and cburnett are GPL, Pirouetti and Pixel are AGPL, and Wikimedia-derived sets inherit cburnett's terms. Alpha, Leipzig and Companion are freeware for personal use. Shahi Ivory Brown allows commercial use but forbids modification.

That left Celtic, Spatial and Fantasy (MIT), RhosGFX (CC0), Kosal, Firi, Totoy, Papercut and Kiwen-suwi (CC BY 4.0), and Chessnut itself. Each was compared at phone size on the walnut board. Firi's gold and silver pieces have pagoda rooks and ornate kings that beginners would misread, Papercut's white pieces fade on light squares, and Spatial's queen and bishop are stylised.

## Decision

- **Three sets, chosen in Settings:** Classic (Celtic by Maurizio Monge, MIT) by default, Modern (Kosal by philatype, CC BY 4.0) and Wood (RhosGFX, CC0). Classic has soft shading and familiar Staunton shapes, Modern is crisp and high-contrast, and Wood's cream and copper match the walnut board. All allow commercial use.
- **Settings** previews each set with a white knight and a black queen on board squares, and names its designer, which is the attribution Kosal's licence asks for. The choice is saved with the other settings; older saves load with Classic.
- **A build script, not hand-edited SVG:** `npm run pieces:build` fetches each piece from a pinned commit and writes `src/components/board/piece-svgs.ts`. `SvgXml` ignores `<style>` rules and gradients that borrow stops through `href`, and on web the 32 pieces on one page would share ids. So the script inlines styles, copies shared gradient stops and prefixes ids per piece. It fails if any style, class or gradient reference survives.
- **Chessnut leaves the board.** The brand mark and launcher icons still use the Chessnut knight, so its licence stays.

## Libraries

SVGO is added as a development dependency for the build script. It inlines CSS, converts style attributes, prefixes ids and minifies; none of it ships in the app.

## Consequences

- The three sets add about 53 KB of SVG text to the bundle, against Chessnut's 30 KB.
- Each board piece reads the setting, so changing it redraws open boards at once.
- Check shading and readability on Android, where gradients render through a different engine ([checklist](../DEVICE-TESTING.md)).

## Alternatives considered

- **Parsing CSS at runtime with `SvgCss`:** keeps the source SVGs untouched, but parses styles for every piece on every render.
- **Replacing the brand mark with a Celtic knight:** keeps one visual language, but means redrawing and exporting every launcher icon and the splash screen. Worth a separate change if the owner wants it.
- **More than three sets:** each extra set adds bundle size and a harder choice. Three distinct looks cover classic, modern and warm tastes.
