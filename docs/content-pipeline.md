# Content and provenance

## Puzzles

Source: [Lichess open database](https://database.lichess.org/#puzzles), CC0-1.0.

Run `python -m pip install zstandard`, then `python scripts/content/import-puzzles.py`. The importer streams the database and keeps popular two- or four-move puzzles: 80 per theme and level, counting the ones already bundled, for eight themes (mate in one, back-rank mate, mate in two, hanging piece, fork, pin, skewer, discovered attack) and five levels (Beginner 400–699, Easy 700–999, Medium 1000–1299, Hard 1300–1599, Expert 1600–1899). Each puzzle is taught as its most specific theme; non-mate themes exclude mating puzzles. It also re-reads the source rows of every bundled puzzle so their theme tags are current, then closes the stream once all quotas are filled (1,742,811 rows on 2026-11-03). Candidates are local intermediate data and are gitignored.

Run `npm run content:verify`. This developer script uses Stockfish 19 Lite from the development-only `stockfish` package. It applies the source setup move, checks the solution at each learner turn, rejects disagreement, validates complete legal lines and writes `content/puzzles.json`. It refuses to drop any previously bundled puzzle, because saved attempts refer to puzzles by id, and prints the count for every theme and level. The engine is not imported by application code or shipped in the application bundle.

The 2026-11-03 run verified all 3,200 candidates: the 1,059 earlier puzzles and 2,141 new ones. Each level holds 633 to 651 puzzles, and every theme has at least 76 tagged puzzles at every level; skill rounds need 10. Levels follow each puzzle's current Lichess rating, so a rebuild can move an earlier puzzle to a neighbouring level (67 did in this run); saved attempts refer to puzzles by id, so nothing stored changes.

The bundle records each source puzzle ID, original game URL, license, engine version, search depth and verification time. Goals and first hints come from `content/skills.json`; explanations are original templates filled only with verified facts (the final capture or mate). They are short starter explanations; beginner testing and chess-editor review remain useful before a public release.

No player rating is inferred from the source puzzle ratings; the player chooses a level. Any legal immediate checkmate is accepted, including alternatives to the recorded line. Other answers follow the verified line. A legal wrong move receives a retry prompt without an invented engine refutation.

`content/skills.json` holds the original concept card, "look for" cue, goal and first hint for each theme, and the two units that group them.

## Guides

The example lines, descriptions and plans were checked against these references:

- [Italian Game](https://www.chess.com/openings/Italian-Game)
- [Caro-Kann Defence](https://www.chess.com/openings/Caro-Kann-Defense)
- [Queen's Gambit](https://www.chess.com/openings/Queens-Gambit)

Each move is validated through the chess domain adapter. A different legal move is described as outside the example line, rather than objectively bad. Guide completion means the learner practiced the example, not that the opening is mastered.

`content/opening-practice.json` adds two branches and two unfamiliar positions per guide. [Opening practice provenance](../content/OPENING-PRACTICE-SOURCES.md) records primary sources, the pinned CC0 Lichess move dataset, and the original teaching text. `npm run content:verify-openings` checks all branches and setup sequences, ensures transfer positions differ from the guide's examples, and reruns depth-14 Stockfish soundness checks for accepted answers. These goal-specific exercises allow for other legal or sound moves; the UI does not invent refutations.

## Artwork

- **Pieces:** the Chessnut set by [Alexis Luengas](https://github.com/LexLuengas/chessnut-pieces), Apache License 2.0 ([licence](../licenses/chessnut-apache-2.0.txt)), stored as SVG strings in `src/components/board/piece-set.ts`. The only change is removing a CSS `style` attribute that React Native does not use.
- **Brand mark and launcher icons:** the Chessnut knight in brass on an ink tile. `assets/images/chesspal-icon.svg` is the source; `icon.png`, the Android adaptive foreground and monochrome layers, `splash-icon.png` and `favicon.png` are exports of it.
- **Interface icons:** paths from [Lucide](https://lucide.dev), ISC License ([licence](../licenses/lucide-isc.txt)), in `src/components/icon.tsx`.
- **Fonts:** Fraunces and Inter from Google Fonts via `@expo-google-fonts`, SIL Open Font License.

Design choices and alternatives: [decision 0003](decisions/0003-design-system.md).
