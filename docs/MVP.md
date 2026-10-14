# Rookie Reps MVP

Audience: beginners who know the rules and want very easy puzzles plus opening ideas.

## Implemented

- **Practice:** 10-puzzle sessions, 100 bundled Lichess puzzles, progressive hints, solution replay, feedback, more practice and review of assisted attempts.
- **Learn:** Italian Game, Caro-Kann Defence and Queen's Gambit. Each guide has move explanations, plans, common mistakes, playback and interactive practice as the relevant side.
- **Progress:** independent and assisted solves, completed workouts, practiced guides, weekly activity and streaks. Sessions and guide positions resume from local storage.
- **Board:** legal tap-to-move interaction, orientation, move highlights, accessible square labels, castling, en passant and explicit promotion choices.
- **Offline:** all learning content and progress stay on the device; no account or backend is needed.

The existing Expo SDK 57 foundation is retained. Production builds and physical-device validation are release gates; an app-store submission additionally needs the owner's Expo/Google Play accounts and signing setup.

## Content

Lichess puzzle data is CC0. The importer selects rated, popular short puzzles; the developer-only Stockfish 19 Lite pipeline checks each learner move at depth 14 before bundling. The installed bundle contains 45 mates in one, 35 material wins and 20 forks. Legality and complete lines are also checked by tests.

The three guides are sourced from Chess.com's opening references, with concise original explanations. They demonstrate example lines, not mandatory replies in every game. [Content details](content-pipeline.md).

## Verify and run

Use Node 22.13+ or Node 24+. Run `npm ci`, `npm run check`, then `npm start` and open in Expo Go. `eas.json` provides preview APK and production AAB profiles; use `npx eas-cli@latest build --platform android --profile preview` after account/project setup.

Placement tests, broader course libraries, game imports, multiplayer, accounts, subscriptions and AI coaching are outside this release. Add features after testing the two learning loops with users.
