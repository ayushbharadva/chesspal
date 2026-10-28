# 0004: Skills, levels, theme strengths and board vision

Date: 2026-10-28. Status: accepted.

## Context

The [Every Day Chess and Lichess investigation](../research/2026-10-28-everydaychess-lichess.md) showed that ChessPal trained only three motifs from 100 puzzles, had no difficulty levels and could not tell a player which patterns they miss. The owner chose four features for the first round and settled three questions: the player picks a level once, hints and unlimited retries stay, and the app ships about 1,000 puzzles.

## Decision

- **Content:** 1,059 Stockfish-verified Lichess puzzles across eight beginner themes and three levels (Beginner under 700, Easy 700–999, Medium 1000–1300). All earlier puzzles stay, so saved attempts remain valid. Each puzzle records its taught theme and every ChessPal theme the source tags.
- **Levels:** chosen on the first "Start practice" and changeable later. Fresh puzzles follow a 2/6/2 mix of easier, at-level and harder, scaled down when due reviews take slots, easiest first. Theme order rotates for variety.
- **Skill ladders:** three five-puzzle rounds per theme. The warm-up is one level below and names the theme; the second is at level without the label; the test is one level above and mixes in two puzzles from other themes. Four of five independent solves clear a round; each try is seeded with a new run number so puzzles change. A theme is mastered only after its test round. Rounds borrow a neighbouring level when fewer than ten puzzles match, and are hidden when even that is too few.
- **Strengths and weaknesses:** performance per theme is average puzzle rating − 500 + 1000 × independent rate (from the Lichess puzzle dashboard), over the last 200 attempts. With five or more attempts, a theme is strong with at least three independent solves above the overall figure, and worth practicing with at least two assisted solves below it. The weakest theme gets one slot in each standard round.
- **Board vision:** 30-second find-the-square rounds from either side; the last 20 scores per side are stored. Rounds do not count toward the practice streak, which stays about learning chess positions.
- **Answer rules are unchanged:** unlimited retries and three hints, with help recorded as assisted. Only independent solves clear a skill round.

## Consequences

- `puzzles.json` grows from 74 KB to about 840 KB. It is bundled with the app; measure start-up on a low-end Android device before release.
- Saved progress gains `level`, `skillProgress` and `visionScores`. Older saves load with defaults; the store version stays 1.
- A skill round shares the single practice slot. If another round is unfinished, the skill screen offers to resume it instead of discarding progress.
- Explanations for every puzzle, including the original 100, now come from theme templates filled with verified facts.

## Alternatives considered

- **Inferring the level from early rounds:** less friction, but harder to explain and test; the owner preferred an explicit choice.
- **Two tries, then the solution:** clearer pass and fail, but harsher for beginners. Skill rounds already require independent solves to clear.
- **A daily race with par and share codes:** deferred until the learning features show value.
