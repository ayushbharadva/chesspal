# 0010: A Learn tab from the rules to advanced play

Date: 2026-11-03. Status: accepted. Widens the audience in [MVP.md](../MVP.md) and adds a fifth tab to [decision 0007](0007-first-run-tabs-plain-words.md).

## Context

ChessPal was built for beginners who already know how the pieces move. The owner wants it to teach complete newcomers as well, with a step-by-step course from the board itself to advanced endgames and strategy, in the spirit of Duolingo's chess path and Chess.com's lessons. The plan and curriculum are in [LEARN-PLAN.md](../LEARN-PLAN.md).

## Decision

- **Five tabs:** Home, Learn, Puzzles, Openings, Progress. Openings keeps its guides. Decision 0007 kept four tabs because Settings did not earn one; a course does.
- **One locked path, no skipping:** four sections, units and lessons in a fixed order. The first unfinished lesson is open, finished ones can be replayed, the rest are locked. The owner chose this over a skip test, so players who know the rules also start at lesson one.
- **Stars, not lives:** each lesson gives one to three stars from slips (wrong answers, hints, moves over par). Replays can only raise them. Nothing limits how much a player can learn.
- **Short lessons built from eight step kinds:** read, stars, tap, choice, move, capture, play and puzzles. Positions and words live in `content/course/`, and tests check every step against chess.js: star and capture drills must be solvable in exactly their par, tap and choice answers that state a position fact must match the board, and every play step's stored solution must beat the defender.
- **Drill boards without kings:** chess.js 1.4 plays such positions with `skipValidation`. `src/chess` uses that only when a king is missing, so full positions stay strictly checked.
- **A simple defender, no engine in the app:** play-it-out steps reply with the legal move that takes material, avoids mate in one and keeps the king free (or races to the pawn). It is used only for basic mates and pawn races.
- **First run:** the welcome screen adds "I'm new to chess", which opens lesson one. Home leads with the next lesson until Section 1 is finished.
- **Streak:** a finished lesson counts as a practice day, like the opening lessons.

## Research

Lichess Learn ([`ui/learn` at `10c9e1d`](https://github.com/lichess-org/lila/tree/10c9e1d2b431746aa9238dedca85f321da6c5a64/ui/learn/src), AGPL-3.0) was read from source for its structure: target-square drills, take-everything drills, scripted lines and par-based ranks. Duolingo Chess and Chess.com were studied only from their public descriptions. REA was not needed: Lichess is open source, Duolingo Chess is a native app and Chess.com's lessons need an account. No code, positions or text were copied.

## Consequences

- Saved progress gains `courseProgress` (results and the lesson in progress). Older saves load with none; a run in a lesson that was removed or shortened starts over.
- The audience line in MVP.md changes to include players who are new to chess.
- Course content is the bulk of the work and ships in four phases, one per section. From Section 2, answers to `move` steps are checked with Stockfish like the opening exercises.

## Alternatives considered

- **Merging Openings into Learn:** keeps four tabs, but the owner preferred Openings to stay as it is.
- **A skip test per unit:** faster for players who know the rules; the owner chose a strictly ordered path.
- **Hearts and XP:** Duolingo-style limits punish beginners for mistakes, and XP adds a second number beside stars and the streak.
- **Bundling Stockfish in the app for play steps:** stronger defence, but it adds megabytes and native work for positions a simple defender handles.
