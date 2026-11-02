@AGENTS.md

## Working on ChessPal with Claude Code

- **App map:** first launch shows `welcome.tsx` until a level is saved. Bottom tabs live in `src/app/(tabs)/`: Home (`index.tsx`), Puzzles (`puzzles.tsx`), Openings (`learn.tsx`) and Progress (`progress.tsx`). Rounds (`workout.tsx`, then `result.tsx`), lessons (`lesson/[id].tsx`), skills, the daily challenge (`daily-route.tsx`), the square trainer (`vision.tsx`) and settings open above the tabs.
- **Copy:** keep visible text short and plain ([decision 0007](docs/decisions/0007-first-run-tabs-plain-words.md)): one line of intro at most, no learning-science jargon (independent, recall, transfer, scaffold) in the UI. All state lives in `src/progress/store.ts` (Zustand persisted to AsyncStorage under `chesspal-progress`).
- **Design tokens:** colors, elevation, fonts, spacing and radii are in `src/constants/theme.ts`; shared UI pieces are in `src/components/` (`ui.tsx` holds pills, rows, chips, segmented controls and badges).
- **Visual checks:** `.claude/launch.json` defines `expo-web` (Expo web on port 8090). Check changed screens at mobile width in both light and dark mode. The web build is only a layout preview; confirm fonts, shadows and the splash screen on Android in Expo Go or a development build.
- **Tests read UI text:** `src/__tests__/navigation.test.tsx` finds buttons, headings and accessibility labels by their text. When you change visible copy or a button label, update the test in the same change.
- **Done means** `npm run check` passes.
