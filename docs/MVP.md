# Rookie Reps MVP

Audience: beginners who know the rules and want very easy puzzles plus opening ideas.

## Implemented

- **Practice:** 10-puzzle sessions, 100 bundled Lichess puzzles, progressive hints, solution replay, feedback, more practice and review of assisted attempts.
- **Recall reviews:** the existing attempt log schedules next-day review, then 3/7/14/30-day intervals after independent due recalls. Assistance resets to next day; same-day or early successes do not postpone review. Standard rounds reserve three due positions while fresh content is available, then use remaining due positions before future familiar ones when needed. Review rounds include due puzzles and immediate assisted retries, up to ten per round.
- **Next learning step:** Home resumes an interrupted lesson first, then surfaces the oldest due lesson recall. With no unfinished or due lesson it suggests an untried application exercise or opening branch, following the most recently practiced guide. Recommendations, due reviews and practice activity refresh at local midnight and when returning to the foreground. Demonstrations do not create attempts; all examples remain available through Explore guides.
- **Learn:** Italian Game, Caro-Kann Defence and Queen's Gambit. Each guide has three example branches, move explanations, plans, common mistakes and demonstration playback. First practice shows move guidance; later recall hides the answer and move notes. Asking for a hint or revisiting the demonstration marks that attempt assisted.
- **Apply and recall:** two original unfamiliar positions per guide ask learners to use a stated opening idea. Goal-specific answers are checked for legality and engine soundness. Branch and exercise attempts use the same delayed review intervals as puzzles, with a separate due queue on Learn. Immediate repetition does not establish delayed retention.
- **Progress:** independent and assisted solves and lesson recalls, completed workouts, practiced guides, weekly activity and streaks. Completed workouts and lesson attempts both count as practice days, with each local date counted once; viewing a demonstration alone does not count. Sessions, selected branches, demonstration positions and exercises resume from local storage. Existing puzzle history and guide progress are preserved; old guide completion does not count as an independent lesson recall.
- **Board:** legal tap-to-move interaction, orientation, move highlights, accessible square labels, castling, en passant and explicit promotion choices.
- **Offline:** all learning content and progress stay on the device; no account or backend is needed.

The existing Expo SDK 57 foundation is retained. Production builds and physical-device validation are release gates; an app-store submission additionally needs the owner's Expo/Google Play accounts and signing setup.

## Content

Lichess puzzle data is CC0. The importer selects rated, popular short puzzles; the developer-only Stockfish 19 Lite pipeline checks each learner move at depth 14 before bundling. The installed bundle contains 45 mates in one, 35 material wins and 20 forks. Legality and complete lines are also checked by tests.

The three guides are sourced from Chess.com's opening references, with concise original explanations. They demonstrate example lines, not mandatory replies in every game. [Content details](content-pipeline.md).

The six added branches also use the pinned official Lichess opening dataset. Six original transfer exercises were checked with Stockfish 19 Lite at depth 14, accepting answers within 35 centipawns of its unrestricted root score. Answers meet the exercise's stated goal; other sound moves may exist. [Opening practice sources and verification](../content/OPENING-PRACTICE-SOURCES.md).

## Verify and run

Use Node 22.13+ or Node 24+. Run `npm ci`, `npm run check`, then `npm start` and open in Expo Go. `eas.json` provides preview APK and production AAB profiles; use `npx eas-cli@latest build --platform android --profile preview` after account/project setup.

Placement tests, broader course libraries, game imports, multiplayer, accounts, subscriptions and AI coaching are outside this release. Add features after testing the two learning loops with users.

Research direction and evidence: [21 October investigation](research/2026-10-21-chess-learning.md).
The review intervals are a transparent pilot rule, not a validated personalized memory model.
