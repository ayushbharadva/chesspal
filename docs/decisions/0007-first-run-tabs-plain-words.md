# 0007: First run, bottom tabs and plain words

Date: 2026-11-03. Status: accepted.

## Context

The owner and friends found the app confusing on first use; it made sense only after three or four sessions. Reviewing every screen as a new player showed three causes:

- **No clear first step.** Home stacked eight entry points (practice, review, daily route, skills, a lesson, this week, board vision, progress). Nothing said which to tap first, and the level picker appeared only after pressing Start.
- **Jargon.** Game words clashed with chess words: the daily route had "forks" and "squares" that were neither chess forks nor board squares, plus "steep path" and "par". Learning-science words leaked into the UI: independent, assisted, recall, transfer, branch, guided practice, scaffold.
- **Too much text.** Most screens opened or closed with a paragraph explaining scoring or caveats, and Practice repeated a note under every puzzle.

## Decision

- **Bottom tabs:** Home, Puzzles, Openings, Progress. Focused tasks (a puzzle round, results, a lesson, a skill, the daily challenge, the square trainer, settings) open above the tabs, which hide the tab bar while you play. JavaScript tabs from `expo-router/js-tabs` keep the Lucide icons, theme fonts and testing setup; native tabs would need SF Symbols and Material icons.
- **Home answers "what now?"** One hero card for today's ten puzzles, then a review row when puzzles are due, the daily challenge, the next opening lesson and this week's streak. Skills, the square trainer and stats move to their tabs.
- **Puzzles tab:** the level, quick practice, review, the daily challenge, every skill by unit and the square trainer, replacing the Skills screen.
- **First run:** a welcome screen with three one-line bullets, then "How well do you play?", then Home. New players see the welcome when no level is saved; players with a level go straight to Home. The first few puzzles show "Tap or drag a piece to move."
- **Plain words:**

  | Before                                   | After                                   |
  | ---------------------------------------- | --------------------------------------- |
  | Daily route, square, fork in the route   | Daily challenge, puzzle, pick your next |
  | Safe path / steep path, par              | Normal / hard, usual score              |
  | Solved independently, assisted           | Solved without help, with help          |
  | Example branches, Learn line / Play line | Variations, Watch / Play                |
  | Guided practice, recall, transfer        | With hints, from memory, new position   |
  | Board vision                             | Square trainer                          |
  | Get a hint / Show solution               | Hint / Show answer                      |

- **Less text:** intros are one line at most, and footnotes are removed. Rules shrink to a short line where they are needed to play (passing a round, challenge points). Opening plans and common mistakes fold into tap-to-open sections.

Behaviour, scoring, scheduling and stored data are unchanged; only navigation and copy move.

## Consequences

- Routes move into `src/app/(tabs)/`; URLs stay `/`, `/learn` and `/progress`, `/skills` becomes `/puzzles`, and `/welcome` is new.
- "Done" on Results returns to the tab the round started from.
- The navigation tests read the new labels.

## Alternatives considered

- **A multi-page swipe tutorial:** more to read before the first puzzle. Three bullets and an immediate puzzle teach faster.
- **Native tabs (`expo-router/unstable-native-tabs`):** the iOS glass bar looks native, but the API is unstable, icons must be platform symbols rather than the design system's Lucide set, and the tests would need native mocks.
- **Five tabs with Settings:** settings change rarely; a gear on Home and a row on Progress are enough.
