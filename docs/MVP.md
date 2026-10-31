# ChessPal MVP

Audience: beginners who know the rules and want very easy puzzles plus opening ideas.

## Implemented

- **Practice:** 10-puzzle sessions from 1,059 bundled Lichess puzzles, progressive hints, solution replay, feedback, more practice and review of assisted attempts.
- **Levels:** the player picks Beginner, Easy or Medium once (changeable from Home or Progress). Fresh puzzles in a round are a fifth one level easier, a fifth one level harder and the rest at level (2/6/2 of ten), easiest first, after up to three due reviews. One at-level slot goes to the player's weakest theme when there is one.
- **Skills:** eight tactic themes in two units (checkmate patterns; winning material), each with an original concept card and "look for" cue. Three five-puzzle rounds per skill: a warm-up one level below with the theme named, a round at level without the label, and a test one level above that hides two puzzles from other themes. Four of five independent solves clear a round; each try uses fresh puzzles; a skill is mastered only after its test round. Skill puzzles feed the attempt log, reviews, themes and streak.
- **Strengths and weaknesses:** per-theme performance adapted from the Lichess puzzle dashboard (average rating − 500 + 1000 × independent rate) over the last 200 attempts. A theme needs five attempts before it is called strong (three independent, above overall) or worth practicing (two assisted, below overall). Shown on Results, Progress and Home.
- **Daily route:** five puzzles a day from one rotating theme, easiest first. At squares 2 and 4 the player picks the safe path (2 points, or 1 with help) or a harder steep puzzle (4 points without help, otherwise nothing). One scored run a day, compared with the median of the player's earlier runs once three exist. Route puzzles feed the attempt log, reviews, themes and streak.
- **Board vision:** 30-second rounds of finding named squares from White's or Black's side; the last 20 scores per side are kept on the device. Rounds do not count toward the practice streak.
- **Recall reviews:** the existing attempt log schedules next-day review, then 3/7/14/30-day intervals after independent due recalls. Assistance resets to next day; same-day or early successes do not postpone review. Standard rounds reserve three due positions while fresh content is available, then use remaining due positions before future familiar ones when needed. Review rounds include due puzzles and immediate assisted retries, up to ten per round.
- **Next learning step:** Home resumes an interrupted lesson first, then surfaces the oldest due lesson recall. With no unfinished or due lesson it suggests an untried application exercise or opening branch, following the most recently practiced guide. Recommendations, due reviews and practice activity refresh at local midnight and when returning to the foreground. Demonstrations do not create attempts; all examples remain available through Explore guides.
- **Learn:** Italian Game, Caro-Kann Defence and Queen's Gambit. Each guide has three example branches, move explanations, plans, common mistakes and demonstration playback. First practice shows move guidance; later recall hides the answer and move notes. Asking for a hint or revisiting the demonstration marks that attempt assisted.
- **Apply and recall:** two original unfamiliar positions per guide ask learners to use a stated opening idea. Goal-specific answers are checked for legality and engine soundness. Branch and exercise attempts use the same delayed review intervals as puzzles, with a separate due queue on Learn. Immediate repetition does not establish delayed retention.
- **Progress:** independent and assisted solves and lesson recalls, completed workouts, practiced guides, weekly activity and streaks. Completed workouts and lesson attempts both count as practice days, with each local date counted once; viewing a demonstration alone does not count. Sessions, selected branches, demonstration positions and exercises resume from local storage. Existing puzzle history and guide progress are preserved; old guide completion does not count as an independent lesson recall.
- **Board:** legal tap-to-move and drag-to-move interaction, sliding moves, a short pause before the opponent's reply, a shake on wrong moves, a marked king in check, orientation, move highlights, accessible square labels, castling, en passant and explicit promotion choices.
- **Sound effects:** six quiet sounds: move, capture, check and checkmate on the board, including replies and demonstrations, plus a soft tone for an independent solve and for a wrong move. All are original, follow the phone's silent switch and leave other audio playing. Improving them is on the to-do list ([decision 0006](decisions/0006-sound-effects.md)).
- **Settings:** system, light or dark appearance, optional haptic feedback and optional sound effects, all saved on the device. Motion follows the device's reduce-motion setting.
- **Offline:** all learning content and progress stay on the device; no account or backend is needed.

The existing Expo SDK 57 foundation is retained. Production builds and physical-device validation are release gates; an app-store submission additionally needs the owner's Expo/Google Play accounts and signing setup.

## Content

Lichess puzzle data is CC0. The importer selects rated, popular short puzzles; the developer-only Stockfish 19 Lite pipeline checks each learner move at depth 14 before bundling. The bundle holds 1,059 puzzles rated 400–1299 across eight themes and three levels, with at least 39 puzzles tagged for every theme at every level. Legality and complete lines are also checked by tests.

The three guides are sourced from Chess.com's opening references, with concise original explanations. They demonstrate example lines, not mandatory replies in every game. [Content details](content-pipeline.md).

The six added branches also use the pinned official Lichess opening dataset. Six original transfer exercises were checked with Stockfish 19 Lite at depth 14, accepting answers within 35 centipawns of its unrestricted root score. Answers meet the exercise's stated goal; other sound moves may exist. [Opening practice sources and verification](../content/OPENING-PRACTICE-SOURCES.md).

## Verify and run

Use Node 22.13+ or Node 24+. Run `npm ci`, `npm run check`, then `npm start` and open in Expo Go. `eas.json` provides preview APK and production AAB profiles; use `npx eas-cli@latest build --platform android --profile preview` after account/project setup.

Shareable race codes, placement tests, broader course libraries, game imports, multiplayer, accounts, subscriptions and AI coaching are outside this release. Add features after testing the two learning loops with users.

Research direction and evidence: [21 October investigation](research/2026-10-21-chess-learning.md).
The review intervals are a transparent pilot rule, not a validated personalized memory model.
