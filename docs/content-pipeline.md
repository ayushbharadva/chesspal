# Content and provenance

## Puzzles

Source: [Lichess open database](https://database.lichess.org/#puzzles), CC0-1.0.

Run `python -m pip install zstandard`, then `python scripts/content/import-puzzles.py`. The importer streams a bounded subset and closes the connection once its quotas are filled. Candidates are local intermediate data and are gitignored.

Run `npm run content:verify`. This developer script uses Stockfish 19 Lite from the development-only `stockfish` package. It applies the source setup move, checks the solution at each learner turn, rejects disagreement, validates complete legal lines and writes `content/puzzles.json`. The engine is not imported by application code or shipped in the application bundle.

The bundle records each source puzzle ID, original game URL, license, engine version, search depth and verification time. Hints and explanations are derived from the verified move/piece/capture/mate facts and the source motif. They are short starter explanations; beginner testing and chess-editor review remain useful before a public release.

No user rating is inferred from the source puzzle ratings. Any legal immediate checkmate is accepted, including alternatives to the recorded line. Other answers follow the verified line. A legal wrong move receives a retry prompt without an invented engine refutation.

## Guides

The example lines, descriptions and plans were checked against these references:

- [Italian Game](https://www.chess.com/openings/Italian-Game)
- [Caro-Kann Defence](https://www.chess.com/openings/Caro-Kann-Defense)
- [Queen's Gambit](https://www.chess.com/openings/Queens-Gambit)

Each move is validated through the chess domain adapter. A different legal move is described as outside the example line, rather than objectively bad. Guide completion means the learner practiced the example, not that the opening is mastered.

`content/opening-practice.json` adds two branches and two unfamiliar positions per guide. [Opening practice provenance](../content/OPENING-PRACTICE-SOURCES.md) records primary sources, the pinned CC0 Lichess move dataset, and the original teaching text. `npm run content:verify-openings` checks all branches and setup sequences, ensures transfer positions differ from the guide's examples, and reruns depth-14 Stockfish soundness checks for accepted answers. These goal-specific exercises allow for other legal or sound moves; the UI does not invent refutations.

## Artwork

The chess-piece SVG geometry in `src/components/board/piece.tsx` and the rook/check mark in `assets/images/rookiereps-mark.svg` are original artwork created for this app. Launcher and splash PNGs are exports of that mark. No third-party piece set is included.
