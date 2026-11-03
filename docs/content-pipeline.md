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

## Learn course

`content/course/section-1.json` to `section-4.json` hold the course: sections, units, lessons and steps. Every position and sentence is original. `src/content/__tests__/course.test.ts` checks, with chess.js:

- every position reads, and the side not to move is never in check;
- star and capture drills are set at exactly their fewest moves, found by search;
- tap answers that claim a piece's moves, the checking pieces, or isolated, doubled or passed pawns match the board;
- choice answers that state check, mate, stalemate, a legal move, an attacked square or a draw match the board;
- move lines are legal, prompts that ask for mate or check get them (for every accepted answer), and pieces moved "to safety" are safe;
- every play step's stored solution beats the app's defender within its move limit;
- puzzle steps have enough bundled puzzles, and puzzles chosen by Lichess tag (deflection, intermezzo, rook endgame…) carry that tag in their source row in `content/puzzle-candidates.json`;
- copy stays under 160 characters per text, without learning-science jargon.
- every lesson has at least three things to do on a board, counting each puzzle.

`npm run content:verify-course` checks every move step after Section 1 with Stockfish 19 Lite at depth 14: each answer within 35 centipawns of the engine's best (or any mate), each scripted reply within 100, and writes the check onto the step. A test requires that record, so editing a line means running the script again (`-- --check` verifies without writing). Section 1 teaches rules, where any legal way out of check is right, so it is checked by tests alone. Lone king-and-pawn races are not engine-scored, since Stockfish without tablebases misjudges them; they are play steps whose solutions the tests replay.

## Artwork

- **Pieces:** three sets the player chooses between in Settings, fetched from pinned commits by `npm run pieces:build` into `src/components/board/piece-svgs.ts`. The script inlines CSS rules, copies gradient stops that were shared through `href`, prefixes ids per piece and minifies with SVGO; the artwork is unchanged.
  - **Classic** (default): Celtic by [Maurizio Monge](https://github.com/maurimo/chess-art), MIT ([licence](../licenses/celtic-mit.txt)), from the Lichess repository.
  - **Modern:** Kosal by [philatype](https://github.com/philatype/kosal), CC BY 4.0 ([licence](../licenses/kosal-cc-by-4.0.txt)). The designer is credited under each set in Settings.
  - **Wood:** [RhosGFX](https://rhosgfx.itch.io/vector-chess-pieces) vector chess pieces, CC0 1.0 ([deed](../licenses/rhosgfx-cc0.txt)), from the Lichess repository.
- **Brand mark and launcher icons:** the Chessnut knight by [Alexis Luengas](https://github.com/LexLuengas/chessnut-pieces), Apache License 2.0 ([licence](../licenses/chessnut-apache-2.0.txt)), in brass on an ink tile. The board no longer uses Chessnut pieces. `assets/images/chesspal-icon.svg` is the source; `icon.png`, the Android adaptive foreground and monochrome layers, `splash-icon.png` and `favicon.png` are exports of it.
- **Interface icons:** paths from [Lucide](https://lucide.dev), ISC License ([licence](../licenses/lucide-isc.txt)), in `src/components/icon.tsx`.
- **Fonts:** Fraunces and Inter from Google Fonts via `@expo-google-fonts`, SIL Open Font License.

Design choices and alternatives: [decision 0003](decisions/0003-design-system.md).
