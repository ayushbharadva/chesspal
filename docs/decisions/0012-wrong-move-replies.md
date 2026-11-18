# 0012: The opponent replies to a wrong puzzle move

Date: 2026-11-18. Status: accepted. Plan and measurements: [REFUTATION-PLAN.md](../REFUTATION-PLAN.md).

## Context

A wrong move in a puzzle shook the board and said "Not quite. Try again." The owner, solving puzzles himself, could not tell why a move was wrong. Players asking Lichess for the same thing note that seeing the reply that punishes a move teaches more than seeing the right answer.

The app has no chess engine, and project rules say answers come from the engine-checked content pipeline, never from guesses in the app.

## Decision

- **Replies worked out ahead of time:** `npm run content:refutations` (`scripts/content/build-refutations.ts`) asks Stockfish 19 Lite, at depth 14, for the opponent's best reply to every legal wrong move in every bundled puzzle and stores it in `content/refutations.json` with a reason letter. Moves that give checkmate are not stored, since any checkmate is accepted.
- **One reply, one line:** the wrong move stays on the board, the reply slides in after a short pause, its square turns red, and a line says why: the reply checkmates, takes a piece, or lets the king escape, or the opponent is safe now, with the theme's hint. A move that still leaves the player three pawns or more ahead is "Good move, but there's a stronger one" with no reply. Words are built in the app from the reason (`src/workout/refutation.ts`), so copy can change without rerunning the engine. Skill rounds that hide the theme get no theme hint.
- **Two icon buttons:** Back one move (`undo-2`) and Reset (`rotate-ccw`), with spoken labels; on a puzzle's first move only Reset. Both keep the mistake, so the puzzle still counts as with help. Moves, Hint and Show answer wait until one is pressed.
- **Puzzle rounds only:** practice, review, skills and the daily challenge, which share `workout.tsx`. Learn lessons and opening lessons are unchanged.
- **Fallback:** a wrong move with no stored reply says "Not quite. Try again."
- **No shaking:** the board no longer shakes after any wrong move or tap, in puzzles, Learn lessons or opening lessons; the wrong tone, haptic and message are the feedback.

## Consequences

- 164,296 wrong moves; 1.74 MB of JSON, loaded on the first wrong move rather than at app start. About 3.6 engine-hours to rebuild; `--engines` runs several engines and `--minutes` stops cleanly so a long run resumes.
- Any change to `content/puzzles.json` needs `npm run content:refutations` again; `src/content/__tests__/refutations.test.ts` fails if a wrong move is missing or extra, and checks replies and reasons against chess.js for every eighth puzzle.
- Saved rounds gain `wrongMove`; it is cleared when a puzzle starts over ([decision 0011](0011-restart-unfinished-items.md)).

## Alternatives considered

- **Stockfish inside the app:** replies for any position, but megabytes of engine and native work, already rejected for Learn in [decision 0010](0010-learn-course.md).
- **Text only, from chess.js:** cheap, but it cannot show the punishing move.
- **A short sequence of replies:** shows longer punishments, but three to five times the data; one reply usually makes the problem clear to a beginner. Left for later.
- **Text buttons:** clearer to a new player but wider; the owner chose icons. Watch the closed test for confusion between the two.
