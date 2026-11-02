# 0005: Daily route, settings and board feel

Date: 2026-10-31. Status: accepted.

## Context

The MVP's learning loops were built, but the board felt static: pieces jumped, a puzzle's reply appeared at the same moment as the player's move, and the only way to move was tapping. Home had grown into a long stack of competing buttons, and Practice could push its main action below the fold. The owner asked for more features and a better UI. The [October research](../research/2026-10-28-everydaychess-lichess.md) listed a daily route as the next feature, and the roadmap listed animations, haptics and drag-to-move.

## Decision

- **Daily route:** five puzzles from one theme a day, seeded by date and level, easiest first, preferring puzzles the player has not seen. Squares 2 and 4 offer a safe path or a steep one. Safe scores 2, or 1 with help; steep scores 4 without help, otherwise nothing, so the most a route can score is 14. Medium players have no level above, so their steep path uses the hardest third of Medium. One scored run a day. Par is the median of earlier runs, shown after three. Hints and retries stay available, consistent with [decision 0004](0004-skills-levels-vision.md), and they simply cost points here. Route puzzles feed the attempt log, reviews, themes and streak.
- **Board feel:** moves slide; the board rests on the player's move for about half a second before the reply; a wrong move shakes the board; the king in check is marked; an independently solved final move is marked. Drag-to-move sits alongside tapping, and every square keeps its accessible button. A drop on an illegal square returns the piece with no penalty, while a legal wrong move counts as a mistake, as it does by tapping.
- **Motion:** all of this follows the device's reduce-motion setting, which plays moves instantly.
- **Settings:** a new screen holds appearance (system, light, dark), haptics and the puzzle level. Older saves load with defaults; the store version stays 1.
- **Layout:** Practice pins its actions in a footer. Home keeps one primary button in the hero, and other cards use quieter buttons and section links.

## Libraries

`expo-haptics` is added for haptic feedback. It is an Expo module included in Expo Go, and on Android the code uses `performAndroidHapticsAsync`, which Expo's documentation recommends over its simulated vibration. Nothing else is added: animation uses React Native's `Animated` and dragging uses `PanResponder`, so the board keeps working the same way in tests and on web.

## Consequences

- After pulling this change, a development build needs `npx expo prebuild` and a rebuild, because a native module was added.
- Dragging inside a scrolling screen depends on locking the scroll view when a drag starts. Check this on a real Android phone ([checklist](../DEVICE-TESTING.md)).
- A completed route counts as a completion with mode `route`, so it counts toward the streak and "Workouts completed", but not as the daily workout.

## Alternatives considered

- **Reanimated and Gesture Handler for the board:** both are installed, and they could run dragging off the JavaScript thread. They add test setup for a benefit not yet measured; revisit if dragging stutters on low-end phones.
- **Share codes for racing friends:** deferred, since they need more design and nobody can use them until the app is released.
- **A daily reminder:** needs `expo-notifications` and a permission prompt; deferred until after device testing.
