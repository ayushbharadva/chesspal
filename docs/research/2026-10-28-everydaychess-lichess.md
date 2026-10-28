# Every Day Chess and Lichess: findings and feature plan

Research date: 28 October 2026. Starting app: `chesspal-rebrand` (`2c485e9`).
Question: which proven practice mechanics should ChessPal add next, and how do the closest products implement them?

Every Day Chess is the closest product to ChessPal: ten daily puzzles, a streak, review of misses, no account. It was analysed with REA because only its shipped JavaScript is available. Lichess is open source, so its code was read directly, as REA's own guidance recommends for source repositories. ChessPal borrows ideas only: no code, puzzle files or teaching text from either product.

## What was investigated

| Target                                                                                                        | Method                                                                                                                                                           | Evidence                                                                                                                                                            | Boundary                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Every Day Chess](https://everydaychess.app/)                                                                 | Captured the six public scripts and puzzle file once, then ran REA 6.7.0 `analyze_javascript_application`, followed by manual reading at the reported locations. | REA Evidence `ev_4f2145b082c3b81c314d41545ec36a415c11bbf9ca832dda8f160c7a5f28b005`; file hashes in [the evidence summary](rea-everydaychess-evidence-summary.json). | Static only: no script was executed. Server endpoints were identified, not exercised. Behaviour is inferred from source and may differ at runtime. |
| [Lichess](https://github.com/lichess-org/lila/tree/ffa4be8221645f143b05948dd591545f2b004225) (`lila@ffa4be8`) | Read the puzzle dashboard, puzzle move check, coordinates trainer and Learn scoring source.                                                                      | Permalinks below.                                                                                                                                                   | AGPL-3.0: ideas only. Server aggregation was read, not run.                                                                                        |

REA parsed 6 scripts (21,626 AST nodes, 373 functions, no parse failures) and listed the app's storage keys and network endpoints. Most `cd_*` keys pass through a small `LS` wrapper (`app.js:13`, `learn.js:11`), and REA reported those calls as possible network endpoints; reading the code confirmed they are `localStorage` keys. Raw captures and the full 23 MB evidence file stay in the ignored `.research/` folder.

## How Every Day Chess works

Observed in the captured source; file and line refer to the asset version `v=202608052226`.

- **Levels and the daily ten.** Four levels by rating: Casual (under 1000), Improver (1000–1400), Club (1400–1800), Advanced (1800+) (`app.js:49`). The daily set is seeded by date and level, so everyone at a level gets the same ten: 2 from the level below, 6 at level, 2 above (`core.js:97`, `core.js:112`).
- **Answering.** Two tries, then the solution plays automatically (`app.js:286`, `app.js:332`). On the final move of a mating puzzle any legal checkmate is accepted (`app.js:293`).
- **Rematches.** Misses join a queue capped at three (`app.js:430`). A rematch leaves the queue only when solved; a miss stays for tomorrow (`app.js:360`). Rematches can be played once per day (`app.js:771`).
- **Streak.** Completing the daily ten on consecutive local dates; a gap resets to one (`core.js:130`).
- **Skill ladders.** Thirteen skills in four units: checkmates, winning material, setting up the shot, endgame tactics (`learn.js:30`). Each skill has three five-puzzle rungs: a warm-up one level below, one at level, and a test one level above (`core.js:402`). Retries draw fresh puzzles (`core.js:407`). The test mixes three target puzzles with two "foils" from other themes in random slots, so the player must recognise the idea without a label (`core.js:407`). The theme is named only on the warm-up (`learn.js:660`). Four of five clears a rung (`learn.js:678`). A skill counts as owned only after its unlabelled test (`learn.js:477`). Skill accuracy counts only puzzles that actually contain the skill (`learn.js:654`).
- **Concept cards.** Each skill has a short explanation and a one-line "what to look for" cue (`cards.js`).
- **Daily race.** Five puzzles seeded by date and level, with a weekday theme (`core.js:436`). Squares two and four offer a steep route one level up. Safe squares score 2 on the first try and 1 on the second; steep squares score 4 or nothing (`core.js:476`). Par is the median of your previous runs (`core.js:487`), and results can be shared as checksummed text codes to race friends without a server (`core.js:501`).
- **Content.** 3,818 Lichess puzzles from 600 to 2200, with these fields: id, FEN, moves, rating, themes and level band.
- **Server-dependent parts.** A percentile against other players (`/api/score`), optional account sync, analytics events (`/api/event`) and error reports. These conflict with ChessPal's offline, no-account, no-analytics scope.

## Lichess implementation references

- **Strengths and weaknesses by theme** ([PuzzleDashboard.scala:17–55](https://github.com/lichess-org/lila/blob/ffa4be8221645f143b05948dd591545f2b004225/modules/puzzle/src/main/PuzzleDashboard.scala#L17-L55)). Performance per theme is the average puzzle rating − 500 + 1000 × first-try success rate. A theme is weak with at least three failures and performance below the overall figure, and strong with at least three first-try wins and performance above it. Themes with fewer than 1/40 of all attempts are ignored, and eight are shown at most.
- **Accepting alternative answers** ([moveTest.ts](https://github.com/lichess-org/lila/blob/ffa4be8221645f143b05948dd591545f2b004225/ui/puzzle/src/moveTest.ts#L10-L37)). Any checkmating move wins at any point of the line, and castling entered as king-takes-rook is accepted.
- **Coordinates trainer** ([ctrl.ts](https://github.com/lichess-org/lila/blob/ffa4be8221645f143b05948dd591545f2b004225/ui/coordinateTrainer/src/ctrl.ts#L51)). Thirty-second rounds in two modes, finding a named square or naming a highlighted one, from White's side, Black's side or random. The last 20 scores per mode and side are kept for a trend line.
- **Lesson stars** ([score.ts](https://github.com/lichess-org/lila/blob/ffa4be8221645f143b05948dd591545f2b004225/ui/learn/src/score.ts)). Each beginner lesson level awards one to three stars by moves taken against a par.

## ChessPal compared

| Area                     | Every Day Chess                              | Lichess                              | ChessPal today                                                   |
| ------------------------ | -------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------- |
| Puzzle themes            | 13 trained skills, 16 tagged themes          | 60+ themes                           | 3 motifs (mate, material, fork), 100 puzzles rated 405–797       |
| Difficulty               | 4 levels; daily mix of easier, level, harder | Rating-matched                       | Easiest unseen puzzles first                                     |
| Wrong answers            | Two tries, then the solution                 | A miss fails; retry or view solution | Unlimited retries and three hints; help is recorded separately   |
| Alternative mates        | Final move only                              | Any move                             | Already accepted (`src/content/validate.ts`)                     |
| Review of misses         | Rematch queue of three                       | Replay of failed puzzles             | Spaced review at 1, 3, 7, 14 and 30 days (more complete)         |
| Strengths and weaknesses | Per-skill accuracy                           | Weak and strong themes dashboard     | None                                                             |
| Board vision             | None                                         | Coordinates trainer                  | None                                                             |
| Gamified challenge       | Daily race with par and share codes          | Puzzle Streak and Storm              | Practice streak only                                             |
| Openings                 | None                                         | Studies                              | Three guides with recall and transfer positions (ChessPal ahead) |

## Proposed features, in order

Each feature lists the evidence it draws on, the ChessPal design and an observable acceptance check.

1. **More tactic themes (content first).** Ladders and weakness tracking need enough puzzles per theme. Extend the Lichess CC0 import and Stockfish check to beginner themes: mate in one, back-rank mate, mate in two, hanging piece, fork, pin, skewer and discovered attack, rated roughly 400–1200. Add a `themes` list alongside `motif`, and keep at least 15 verified puzzles per theme and level (Every Day Chess hides a rung below 15). _Check:_ `npm run content:verify` reports the per-theme counts and every puzzle passes the engine check.
2. **Skill ladders.** A Skills section with units, three rungs per theme, five puzzles per rung, four of five to clear, fresh puzzles on retry, a theme label only on the warm-up, and a test rung that hides two other-theme puzzles among three target ones. "Mastered" requires the test rung. Each skill opens with an original concept card and look-for cue. Ladder attempts feed the existing attempt log, so spaced review and the streak include them. _Check:_ unit tests for rung selection, foils and clearing; navigation test clears a rung and shows the skill as mastered only after the test.
3. **Strengths and weaknesses.** Adapt the Lichess formula to ChessPal's independent and assisted attempts, with thresholds suited to small numbers. Show "Strongest" and "Keep practising" on Results and Progress (the result screen in the original plan), and let the daily ten include one puzzle from the weakest theme. _Check:_ pure-function tests with fixed attempt histories; Progress names a weak theme only after the minimum attempts.
4. **Levels and a daily mix.** Ask a beginner-friendly level once (changeable later): two easier, six at level and two harder puzzles, keeping today's three review slots. _Check:_ selection tests by level; a new player sees the level choice once.
5. **Board vision trainer.** A thirty-second find-the-square drill from either side, with best and recent scores stored on the device. No new content is required. _Check:_ tests for scoring and orientation; the round ends at zero and saves the score.
6. **Daily route (later).** A five-puzzle daily route with an optional harder path on two squares, scored against your own median. Text share codes can follow without a server. Build it after the learning features show value.

Not adopted: server percentiles, accounts and sync, analytics beacons, a hand-written rules engine (ChessPal keeps chess.js), and any of Every Day Chess's puzzle files or concept card text.

## Decisions for the owner

- Should the level be chosen by the player at first launch, or inferred from the first rounds?
- Should ChessPal move to "two tries, then the solution", or keep unlimited retries with hints? The current rule supports beginners but makes failure invisible.
- How many puzzles should ship in the app? With hints, explanations and source records, each 1,000 ChessPal puzzles adds about 0.6–0.7 MB of JSON (Every Day Chess stores about 0.17 MB per 1,000 without them).
