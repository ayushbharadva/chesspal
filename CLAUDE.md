@AGENTS.md

## Working on ChessPal with Claude Code

- **App map:** Home (`src/app/index.tsx`) leads to Practice (`workout.tsx`, then `result.tsx`), Learn (`learn.tsx`, then `lesson/[id].tsx`) and Progress (`progress.tsx`). All state lives in `src/progress/store.ts` (Zustand persisted to AsyncStorage under `chesspal-progress`).
- **Design tokens:** colors, elevation, fonts, spacing and radii are in `src/constants/theme.ts`; shared UI pieces are in `src/components/` (`ui.tsx` holds pills, rows, chips, segmented controls and badges).
- **Visual checks:** `.claude/launch.json` defines `expo-web` (Expo web on port 8090). Check changed screens at mobile width in both light and dark mode. The web build is only a layout preview; confirm fonts, shadows and the splash screen on Android in Expo Go or a development build.
- **Tests read UI text:** `src/__tests__/navigation.test.tsx` finds buttons, headings and accessibility labels by their text. When you change visible copy or a button label, update the test in the same change.
- **Done means** `npm run check` passes.
