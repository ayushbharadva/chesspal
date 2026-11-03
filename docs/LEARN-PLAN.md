# Learn tab: plan

Written 2026-11-03 on `feat/next-features`. A step-by-step course from "what is a chessboard" to advanced endgames and strategy, in a new Learn tab. Owner decisions are recorded in [decision 0010](decisions/0010-learn-course.md).

Progress:

- ✅ P1 Foundations: chess helpers, course types and checks, pure course logic, store and save upgrade
- ✅ P2 Screens: five tabs, the Learn path, the lesson player, welcome and Home changes, first unit
- ✅ P3 Section 1 content: Learn the game (rules)
- ✅ P4 Section 2 content: Beginner, with the engine check script
- ⬜ P5 Section 3 content: Intermediate
- ⬜ P6 Section 4 content: Advanced
- ⬜ P7 Docs, device checklist and final visual pass

Each phase ends with `npm run check` passing, a visual check at mobile width in light and dark mode, and one commit. Nothing is pushed.

## What the owner chose

| Question    | Answer                                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| Tabs        | Five: Home, Learn, Puzzles, Openings, Progress. Openings stays as it is.                                    |
| Progression | A locked path, no skipping: each lesson unlocks the next.                                                   |
| Rewards     | One to three stars per lesson, from mistakes and hints. No lives, nothing that blocks play.                 |
| Research    | The open-source Lichess Learn code read directly, plus public descriptions of Duolingo Chess and Chess.com. |
| First run   | The welcome screen adds "I'm new to chess", which opens lesson 1.                                           |
| Home        | Until Section 1 is finished, Home's top card is "Continue: next lesson". Afterwards it is a row.            |
| Commits     | One per phase on `feat/next-features`.                                                                      |

## Research

Lichess Learn ([`ui/learn` at `10c9e1d`](https://github.com/lichess-org/lila/tree/10c9e1d2b431746aa9238dedca85f321da6c5a64/ui/learn/src), AGPL-3.0, ideas only) was read from source, as REA's guidance recommends for open repositories. REA was not run: Duolingo Chess is a native app, and Chess.com's lessons are behind an account.

- **Structure:** 4 categories, 18 stages, 3 to 9 levels each (`stage/list.ts`). Chess pieces (rook, bishop, queen, king, knight, pawn), fundamentals (capture, protection, combat, check, out of check, mate in one), intermediate (setup, castling, en passant, stalemate) and advanced (piece value, check in two).
- **Level types:** collect "apples" on target squares with a lone piece in as few moves as possible (`stage/rook.ts`); take every enemy piece without losing yours (`stage/combat.ts`); play a scripted line where any other move fails (`scenario.ts`); pass a test on the final position, such as check, mate, or a pawn on a square (`assert.ts`).
- **Stars:** finishing within par moves gives the top rank, up to an eighth over par the middle, otherwise the lowest (`score.ts`).
- **Duolingo Chess (public descriptions):** a single path of short lessons, each a few guided board steps, unlocking in order; a short "aha" explanation before practice.
- **Chess.com lessons (public catalogue):** courses grouped by level (beginner to expert) across rules, tactics, strategy, openings and endgames, each a short explanation followed by interactive challenges.

ChessPal takes the ideas (target-square drills, a scripted line, a final-position test, par-based stars, a locked path) and writes its own positions and words.

A check of chess.js 1.4.0 showed that `new Chess(fen, { skipValidation: true })` plays positions without kings, which the piece drills need. Only `src/chess` may use it.

## How a lesson works

A lesson is 4 to 10 steps and takes 2 to 5 minutes. Each step is one of:

| Step      | What the player does                                                        | How it is checked                                                        |
| --------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `read`    | Reads one or two short sentences, with an optional board and marked squares | Nothing to check                                                         |
| `stars`   | Moves one or two pieces onto every star, on a board without kings           | The board accepts only legal moves; extra moves over par count as a slip |
| `tap`     | Taps the asked squares, such as "every square the knight can reach"         | Tests compare the answer list with chess.js                              |
| `choice`  | Picks one answer, such as "check, checkmate or stalemate?"                  | Tests check the answer against chess.js where it is a position fact      |
| `move`    | Finds a move, then the next after a scripted reply                          | Answers are legal; from Section 2 they are Stockfish-checked             |
| `capture` | Takes every enemy piece without losing one                                  | The board stops a move onto an attacked square                           |
| `play`    | Wins against a simple defender: checkmate, or promote, within a move limit  | Checkmate and promotion come from chess.js                               |
| `puzzles` | Solves a few bundled puzzles of one theme and level                         | The existing engine-verified puzzles                                     |

Stars for a lesson: no slips gives three stars, one or two gives two, more gives one. A slip is a wrong move, a wrong tap or choice, a hint, or a move over par. Playing a lesson again can only raise its stars. Finishing a lesson counts as a practice day for the streak, like the other lessons.

The `play` defender picks, from chess.js legal moves, the reply that keeps its king most mobile and avoids immediate mate, so it resists sensibly without an engine in the app. It is used only for basic mates and simple pawn races.

## Code layout

- `content/course/*.json`: one file per section, holding units, lessons and steps. Words and positions live only here.
- `src/content/course.ts` and types in `src/content/types.ts`: loading and lookups.
- `src/chess`: helpers for drill boards (positions without kings, keeping the turn with the player, attacked squares).
- `src/course/`: pure logic for path order and locks, step answers, slips and stars, the next lesson and the defender's reply.
- `src/progress/store.ts` and `src/storage/schema.ts`: saved course progress (best stars per lesson, the current lesson and step), with older saves upgraded.
- `src/app/(tabs)/learn.tsx`: the path. Today's Openings screen moves to `src/app/(tabs)/openings.tsx`.
- `src/app/course/[id].tsx`: the lesson player.
- `scripts/content/verify-course.ts`: Stockfish checks for `move` steps from Section 2 on, like the opening exercise check.

## Curriculum

Four sections, 21 units, 84 lessons. Section names show on the path; lesson titles are what the player taps.

### Section 1: Learn the game

| Unit                       | Lessons                                                             |
| -------------------------- | ------------------------------------------------------------------- |
| 1. The board               | The goal of chess · Squares and their names · Setting up the pieces |
| 2. Straight and diagonal   | The rook · The bishop · The queen                                   |
| 3. King and knight         | The king · The knight · Knight practice                             |
| 4. Pawns                   | How pawns move · How pawns capture · Promotion                      |
| 5. Capturing and defending | Capturing · Protecting your pieces · Safe squares · Capture battle  |
| 6. Check and checkmate     | Check · Getting out of check · Checkmate · Mate in one              |
| 7. Special moves and draws | Castling · En passant · Stalemate · Other draws                     |
| 8. Playing a game          | What pieces are worth · Reading chess moves · Your first moves      |

### Section 2: Beginner

| Unit                 | Lessons                                                                              |
| -------------------- | ------------------------------------------------------------------------------------ |
| 9. Opening basics    | Take the center · Bring out your pieces · Castle early · Early traps to avoid        |
| 10. Basic checkmates | Two rooks · Queen and king · Rook and king · Queen mates up close                    |
| 11. Tactics 1        | Free pieces · Forks · Pins · Skewers · Discovered attacks                            |
| 12. Mate patterns    | Back-rank mate · Smothered mate · Mates with two pieces · Mate in two                |
| 13. Stop blundering  | Checks, captures, threats · Count attackers and defenders · Trade when you are ahead |

### Section 3: Intermediate

| Unit                  | Lessons                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| 14. Pawn endgames     | King and pawn against king · Opposition · The pawn's square · Passed pawns · Breakthroughs         |
| 15. Tactics 2         | Double check · Removing the defender · Deflection and decoy · Overloaded pieces · In-between moves |
| 16. Using your pieces | Active pieces · Rooks on open files · The seventh rank · Knight outposts · Good and bad bishops    |

### Section 4: Advanced

| Unit                       | Lessons                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 17. Pawn structure         | The isolated pawn · Doubled and backward pawns · Pawn chains · Pawn majorities · The minority attack                                  |
| 18. Rook endgames          | Rook behind the passed pawn · Cutting off the king · Building a bridge (Lucena) · The third-rank defence (Philidor) · The active rook |
| 19. More endgames          | Bishop against knight · The wrong bishop · Queen against pawn · Opposite-coloured bishops                                             |
| 20. Attack and defence     | Attacking the castled king · Opposite-side castling · The bishop sacrifice on h7 · Defending calmly                                   |
| 21. Thinking like a player | Candidate moves · Stop their plan · Turning an advantage into a win · Seeing moves ahead                                              |

## Phases

### P1 Foundations

1. Decision 0010.
2. `src/chess`: `drillPosition`, legal moves and a move that keeps the turn with the player on boards without kings, `attackedSquares`, `isSquareAttacked`.
3. Course types, loader and validation tests (ids unique, every FEN legal for its step, answers legal, star squares reachable, `tap` and `choice` answers match chess.js where they state a position fact).
4. `src/course/`: path order, unlocks, step answers, slips to stars, next lesson, defender reply. Unit tests.
5. Store slice and save upgrade, with storage tests.

### P2 Screens

1. Five tabs; Openings moves to `openings.tsx`; a Lucide graduation-cap icon.
2. Learn path: sections, units, lesson nodes with locked, next and starred states; tapping the next lesson starts it.
3. Lesson player for every step type; the board gains star markers, marked squares, arrows and a tap-a-square mode.
4. Welcome adds "I'm new to chess"; Home gets the Learn card or row.
5. Unit 1 content so the loop runs end to end. Navigation tests for the tab, a lesson and the lock.

### P3–P6 Content

One section per phase. From P4, `npm run content:verify-course -- --check` checks every `move` answer with Stockfish 19 Lite at depth 14, accepting answers within 35 centipawns of the best (the opening exercise rule), or any checkmate.

### P7 Finish

Update MVP.md, CLAUDE.md, the content pipeline doc and the device checklist; final visual pass of the path and each step type in both themes.
