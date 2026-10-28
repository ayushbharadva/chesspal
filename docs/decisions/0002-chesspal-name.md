# 0002: Rename to ChessPal

Date: 2026-10-28. Status: accepted.

## Context

"Rookie Reps" did not read as a chess learning app to people seeing it for the first time. The owner's first choice, ChessMate (chess + checkmate), is used by several existing chess apps and services ([PLAN.md, section 2](../PLAN.md#2-names)).

## Decision

- The app is called **ChessPal**: "chess" plus "pal", a friend that helps you practise. It keeps the friendly meaning of "mate" and names the subject directly.
- Identifiers follow the name: Expo slug and URL scheme `chesspal`, Android package and iOS bundle identifier `com.ayushbharadva.chesspal`, progress storage key `chesspal-progress`.

## Consequences

- The app has not been published, so changing the package identifier is free now. Once a build is on Google Play the package can never change.
- A build with the new package installs as a separate app, so locally saved progress from earlier Rookie Reps builds does not carry over. No storage migration was added because there are no users yet.
- Before publishing, search the Play Store and App Store for "ChessPal", check domains and social handles, and run the trademark searches in [PLAN.md](../PLAN.md#before-you-commit-to-a-name-about-15-minutes). The 2026-10-28 web searches found no chess app with this exact name, only a GitHub engine project and a Lichess team; that is not a trademark clearance.
- Historical documents keep the old name where they describe past decisions.

## Alternatives considered

PawnMate (keeps the checkmate pun, but pawnmate.com is pawn-shop software), Chessons, ChessHabit, Chess Sprout and PawnPath. Chessentials, Chessling, FirstMove, Chess Steps, Chess Gym, ChessBuddy, ChessDay, Chess Climb, ChessCubs, Knightly, Pawn to Queen and ChessStart were already in use.
