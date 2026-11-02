# 0008: Hard and Expert levels, and more puzzles per level

Date: 2026-11-03. Status: accepted.

## Context

The owner asked for more puzzle levels and more puzzles at each level. Medium (1000–1299) was the top level, so players who outgrew it had nothing harder, and the daily challenge's hard picks for Medium came from Medium itself ([decision 0005](0005-daily-route-settings-board-feel.md)). Each theme had about 40 puzzles per level, so regular players met repeats and review puzzles sooner.

## Decision

- **Two new levels above Medium:** Hard (1300–1599) and Expert (1600–1899). Beginner, Easy and Medium keep their rating ranges and numbers, so saved levels and every bundled puzzle keep their meaning.
- **80 puzzles per theme and level**, counting the ones already bundled: 3,200 in all, up from 1,059. The importer uses the same filters as before (popular, at least 100 plays, one or two learner moves), and every puzzle passes the same depth-14 Stockfish check. No earlier puzzle is dropped.
- **Selection:** the 2/6/2 round mix, the skill ladder and the daily challenge extend to five levels. Medium rounds and Medium's skill test now draw their harder puzzles from Hard. Expert is the top level, so its harder slots stay at Expert, and its daily challenge hard picks come from the hardest third of Expert.
- **Choosing a level:** five rising bars beside each level show the ladder at a glance, replacing three unrelated icons.
- **Changing level mid-round:** a practice round's unstarted puzzles switch to the new level at once. Finished puzzles, the puzzle in progress (once a move, hint or mistake is made) and review puzzles stay. Skill rounds and the daily challenge keep the level they started at, and review rounds have no level. The Level screen says which applies, and each practice puzzle shows its level.
- **Skill progress per level:** passed rounds and mastery are kept for each level, so rounds passed at Beginner do not show as passed at Expert, and switching back restores them. A skill round records its level, so a level change during the round still credits the right level. Older saves kept one set of skill progress; it moves under the level saved with it, the best record of where it was earned.

## Consequences

- `content/puzzles.json` grows from 0.84 MB to 2.57 MB, and the app bundle grows with it. The app loads every puzzle at start-up; check cold-start time on a slower Android phone ([checklist](../DEVICE-TESTING.md)).
- Selecting a round, a skill round or the day's challenge scans every puzzle. With 3,200 puzzles each scan takes under 10 ms on a laptop.
- A rebuild re-levels earlier puzzles from their current Lichess rating; 67 moved to a neighbouring level in this run. Saved attempts refer to puzzles by id, so progress is unaffected.

## Alternatives considered

- **Splitting the existing range into finer levels:** this would change what a saved level means and move hundreds of bundled puzzles between levels.
- **Levels above 1900:** puzzles that strong mostly need three or more learner moves, beyond the short tactics the app teaches.
- **Building hints and explanations at load time to shrink the bundle:** about a third of each puzzle entry repeats theme text. Worth doing if start-up time on a real phone proves slow, but not before measuring.
