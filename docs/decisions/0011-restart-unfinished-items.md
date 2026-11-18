# 0011: Unfinished puzzles and lessons start over

Date: 2026-11-18. Status: accepted.

## Context

Puzzle rounds, Learn lessons and opening lessons saved the exact position reached, so leaving and coming back resumed mid-puzzle or mid-lesson. Opening lessons went further: a move into a variation left unfinished earlier jumped to that variation's saved position with "Picking up where you left off". The owner wants a returning player to see each item from its beginning.

## Decision

- **What starts over:** an unfinished puzzle (from its first move), an unfinished Learn lesson (from step 1) and an unfinished opening lesson (from its first move).
- **When:** leaving the screen part-way (back to Home or another tab) or reopening the app. Briefly switching to another app keeps the position, unless Android closes ChessPal in the background.
- **What is kept:** a round's puzzles, the puzzle reached, finished results and daily challenge picks; finished lessons and stars; help, mistakes and Learn slips from before, so leaving cannot turn a helped attempt into one without help. The owner may revisit keeping help later.
- **Opening lessons:** the main line no longer resumes from its saved practice position, and a move into a variation left unfinished carries on there, combining the earlier help and mistakes, instead of jumping to its saved position. Home's opening row says "Restart lesson".

`restartPuzzle` (`src/workout/session.ts`), `restartCourseRun` (`src/course/path.ts`) and `restartLesson` (`src/learning/lesson.ts`) apply the rule; the screens call them when they close, and `decodeProgress` applies them when saved progress loads.

## Consequences

- Saved progress keeps its shape; older saves load and their unfinished items start over.
- `guideProgress.practicePly` is still saved but no longer read.
- The resume tests, MVP, README and device checklist describe the new behaviour.

## Alternatives considered

- **Restart only when the app reopens:** leaving to Home and returning would still resume mid-puzzle; the owner chose one rule for both.
- **Forget help on restart:** simpler, but closing the app after a mistake would make the next solve count as without help.
