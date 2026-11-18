# Wrong-move replies: plan

Written 2026-11-17 on `feat/wrong-move-replies`. When a player makes a wrong move in a puzzle, the opponent replies with the move that punishes it, a short line says why, and the player can go back one move or reset the puzzle. Decision record: [0012](decisions/0012-wrong-move-replies.md). Unfinished puzzles now start over when left ([decision 0011](decisions/0011-restart-unfinished-items.md)), so a wrong move on show is never restored.

Progress:

- ✅ P0 Measure: script written, 50-puzzle sample run, depth and data format chosen (results below)
- ✅ P1 Full run: `content/refutations.json` committed (results below)
- ✅ P2 Content access and content tests
- ✅ P3 Pure logic, saved-session upgrade and unit tests (notes below)
- ✅ P4 Screen, icon buttons and navigation tests (notes below)
- ✅ P5 Docs and decision record
- [ ] P6 Android device check

Each phase ends with `npm run check` passing and one commit.

## What the owner chose

| Question                | Answer                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| Where replies come from | Worked out ahead of time with Stockfish in the content pipeline. No engine in the app.               |
| How much to show        | One opponent reply, played on the board, plus one line of text.                                      |
| Buttons                 | Icon only: Back one move (`undo-2`) and Reset (`rotate-ccw`). On the first move, only Reset.         |
| Scope                   | Puzzle rounds in `workout.tsx`: practice, review, skills and the daily challenge. Not Learn lessons. |
| Timing                  | Before the closed test.                                                                              |

Rejected: Stockfish inside the app (size, native work; already rejected in decision 0010) and text without a reply (cannot show the punishing move).

## P0 results (2026-11-18)

50 puzzles, every 64th by rating, so all levels are covered: 2,469 wrong moves searched (49 per puzzle, about 1.9 player moves each).

| Depth | Time per search | Full set (3,200 puzzles) | Same reply as depth 14 | Same reason as depth 14 |
| ----- | --------------- | ------------------------ | ---------------------- | ----------------------- |
| 10    | 14 ms           | 0.6 engine-hours         | 82.4%                  | 94.6%                   |
| 12    | 22 ms           | 1.0 engine-hours         | 88.3%                  | 96.6%                   |
| 14    | 67 ms           | 2.9 engine-hours         | —                      | —                       |

Timings are from a 2-core cloud machine; divide the engine-hours by the number of engines a laptop runs.

- **Depth: 14.** It matches the puzzle and course pipelines, and 2.9 engine-hours is affordable. Two runs at the same settings gave identical output.
- **`alsoGood` threshold: 300 (three pawns).** No wrong move in the sample left the player 300 or more ahead; the best was in the 100–299 band (4 of 2,469). The bundled puzzles have one clear answer, so this code is a safety net.
- **Reasons at depth 14:** capture 1,455 (59%), defend 943 (38%), mate 41, escape 30, stalemate 0, alsoGood 0.
- **Format: compact strings.** Nested JSON would be about 4.1 MB for the full set; compact strings about 1.7 MB (`puzzles.json` is 2.5 MB).
- **Wording to fix in P3:** in checkmate puzzles a capture reply is true but misses the point ("Black takes your pawn on f5" when the answer was a mate). Add "That's not checkmate." before the capture line in checkmate themes.

## P1 results (2026-11-18)

- 3,200 puzzles, 164,296 wrong moves searched at depth 14: 3.6 engine-hours (about 1.5 hours with two engines on the 2-core cloud machine, run in nine-minute parts with `--minutes 9`). Higher-rated puzzles take longer, so the P0 estimate of 2.9 was low.
- `content/refutations.json`: 1.74 MB, every bundled puzzle covered.
- Reasons: capture 97,250 (59%), defend 57,577 (35%), mate 7,553 (4.6%), escape 1,857, alsoGood 59, stalemate 0.
- `alsoGood` cases checked by hand: non-mating moves in positions already won, such as a rook move instead of mate in one on the last move of a mate-in-two.
- Same output: a fresh 50-puzzle run without the progress file matched the committed file for all 50 puzzles.

## P3 notes (2026-11-18)

- `wrongMoveMessage` in `src/workout/refutation.ts` writes the line. Where a round hides the theme (skill rounds 2 and 3, "Find the best move"), it leaves out "That's not checkmate", the king escape and the theme hint, and ends with "Look for checks, captures and threats."
- To keep the app usable between phases, P3 already shows the wrong move and the reply on the board, the reason in a danger card, and plain text buttons "Back one move" and "Reset". P4 turns them into icon buttons and adds the pause before the reply, the red square and the sounds.
- Hint and the hint square stay hidden while a wrong move is shown.

## P4 notes (2026-11-18)

- The reply's square uses the board's existing `wrongSquare` tint (`boardWrong`, already used by Learn drills), so no new colour pair was needed.
- `IconButton` lives in `src/components/button.tsx` beside `Button`: 64 × 50 or larger, a required `accessibilityLabel`, the same variants. `undo-2` comes from `lucide-static` 1.75.0; `rotate-ccw` was already there and matches it.
- A second `useReplyPause` holds the wrong move for 480 ms before the reply slides in; the buttons are disabled and the reason waits until the reply lands.
- Back one move and Reset give the board a new `key`, so the jump back has no slide or sound. The board never shakes: the owner removed the shake everywhere on 2026-11-18.
- The new-player tip and the hint are hidden while a wrong move is shown.
- Checked in the web build at 390 px wide in light and dark mode with Chrome (a back-rank mate where Rd7 lets the queen take on e4 with check).

## How it works

### 1. Data (made once on a laptop)

`scripts/content/build-refutations.ts`, run with `npm run content:refutations` (`-- --sample 50` for a quick sample, `--engines N` to set parallel engines):

- For every puzzle position where the player moves, try every legal move except the stored answer and moves that give checkmate (the app already accepts any checkmate).
- For each wrong move, ask Stockfish for the opponent's best reply and the score after it.
- Save the reply and a reason letter. Words are not stored; the app builds them from the reason, so copy can change without rerunning the engine.
- `--minutes N` stops taking new puzzles after N minutes; run again to continue.
- Runs one Stockfish process per CPU core minus one and saves progress after each puzzle to `content/refutations.json.progress.jsonl` (ignored by Git), so a stopped run resumes. Rows saved with another depth or threshold are redone; after changing how reasons are chosen, delete the progress file.

Format: puzzle id → one string per player move (ply 0, 2, 4…). Each string lists that position's wrong moves, space-separated, as wrong move + reply + reason letter. Moves use UCI (Universal Chess Interface) notation, like `e2e4`; the reply is missing when there is none.

```json
{
  "001w5": ["f4f5e6f5c c3c4e6e5d …", "g7g8bh7h8e …"]
}
```

`f4f5e6f5c` reads: f4–f5, answered by e6xf5, reason capture. Letters and reasons are shared through `REFUTATION_REASON_LETTERS` in `src/content/types.ts`; none is a promotion letter, so a five-letter move like `g7g8b` still parses.

### 2. Reason codes

Checked in this order; the first match wins.

| Code        | Letter | When                                                                       | Text (example)                                      |
| ----------- | ------ | -------------------------------------------------------------------------- | --------------------------------------------------- |
| `stalemate` | s      | The wrong move leaves the opponent no legal move and no check              | "That's stalemate, a draw. Give the king a square." |
| `alsoGood`  | g      | The player is still 300 or more ahead after the move, or has a forced mate | "Good move, but there's a stronger one."            |
| `mate`      | m      | The reply is checkmate                                                     | "Black checkmates you: Queen to h2."                |
| `capture`   | c      | The reply takes one of the player's pieces                                 | "Black takes your knight on f6."                    |
| `escape`    | e      | A checkmate puzzle and the reply is a king move                            | "The king escapes to g7."                           |
| `defend`    | d      | Anything else                                                              | "Black is safe now. Look for a fork."               |

`stalemate` and `alsoGood` have no reply; the player's move stays on the board with the message. The `defend` hint uses the puzzle's theme. Colour names come from the side to move. Move words reuse `describeMove` and `PIECE_NAMES` from `src/chess`.

### 3. App logic (pure TypeScript, tested before screens)

- `src/content/refutations.ts` (new): `refutationFor(puzzleId, ply, move)`. Parses the strings and loads the JSON on first use, not at app start.
- `src/workout/refutation.ts` (new): turns a reason into the sentence.
- `src/workout/session.ts`:
  - A wrong move with stored data sets `wrongMove` and adds a mistake (still counts as "with help").
  - `undoWrongMove(session)` clears `wrongMove`, back to the same position.
  - `resetPuzzle(session)` sets ply to 0, clears `wrongMove` and hints; mistakes and help stay.
  - While `wrongMove` is set, answers, hints and Show answer are ignored.
  - No stored data for a move: `lastWrong` and "Not quite. Try again.", without a shake.
- `src/storage/schema.ts`: the saved session gains `wrongMove` (a move or `null`) for validation; older saves load with `null`. Leaving or reopening clears it with the rest of the unfinished puzzle ([decision 0011](decisions/0011-restart-unfinished-items.md)).
- Reset reuses `restartPuzzle` from decision 0011.

### 4. Screen (`src/app/workout.tsx`)

- The wrong move stays on the board, no shake. After the usual short pause (`useReplyPause`), the reply slides in.
- The reply's square is marked in red with the board's `wrongSquare` tint.
- Sounds: the wrong tone with the player's move; the board already plays the reply's move, capture or check sound. Error haptic on the wrong move.
- A danger `Card` below the board: title "Not quite.", body the reason line, `accessibilityLiveRegion="polite"`.
- The footer swaps Hint and Show answer for two icon buttons:
  - New `IconButton` in `src/components/`, matching `Button`, at least a 48 × 48 dp touch area, required `accessibilityLabel`.
  - Back one move: `undo-2` (add the Lucide path to `src/components/icon.tsx`), label "Back one move". Hidden on ply 0.
  - Reset: `rotate-ccw`, label "Reset".
- Copy stays plain (decision 0007): no "refutation" anywhere in the UI.

## Phases

| #   | Phase                    | Done when                                                                                                                                                                                                                                                                                                                                                                          |
| --- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0  | Measure                  | ✅ Results above                                                                                                                                                                                                                                                                                                                                                                   |
| P1  | Full run                 | `content/refutations.json` committed; a second run with the progress file deleted gives the same file                                                                                                                                                                                                                                                                              |
| P2  | Content access and tests | ✅ `src/content/refutations.ts` and `src/content/__tests__/refutations.test.ts`: every wrong move of every puzzle stored and nothing else; replies legal and reasons matching the board for every eighth puzzle (playing all 164,296 replies took 130 s; the sample takes 9 s). Both tests fail on a deliberately broken entry. Android bundle before P3 imports the file: 4.3 MB. |
| P3  | Logic and save upgrade   | ✅ `src/workout/__tests__/refutation.test.ts` and a navigation test (wrong move → reason → Reset → solve, counted with help)                                                                                                                                                                                                                                                       |
| P4  | Screen                   | ✅ Navigation tests for Reset on the first move and Back one move on the second; visual check above                                                                                                                                                                                                                                                                                |
| P5  | Docs                     | ✅ Decision 0012; MVP.md, README, content-pipeline.md, DEVICE-TESTING.md and CLAUDE.md updated                                                                                                                                                                                                                                                                                     |
| P6  | Android device           | Cold start time with the new file; the pause and reply feel right; icons readable in both themes; TalkBack reads both buttons                                                                                                                                                                                                                                                      |

## Risks

- **Puzzle changes:** any change to `puzzles.json` needs `npm run content:refutations` again. The P2 coverage test fails if it is missed.
- **Startup cost:** 1.7 MB more JSON. Load it on the first wrong move and measure cold start on a device in P6.
- **Icon-only buttons:** watch in the closed test whether players tell the two apart. If not, add a small label under each.

## Out of scope

- Longer replies (several opponent moves).
- Learn lesson and opening lesson moves.
- Showing the right answer after a wrong move (Show answer already does this).
