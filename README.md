# Rookie Reps

A 5-minute daily chess workout for beginners. Open the app, solve 3 short challenges, keep your streak, learn something, close the app.

**Status:** Milestone 2 (app shell) is done. Roadmap: [docs/PLAN.md](docs/PLAN.md).

## Requirements

- Node 22 (see `.nvmrc`)
- An Android phone with [Expo Go](https://expo.dev/go), or an Android emulator from Android Studio

## Getting started

```bash
npm install
npm start   # press "a" to open the Android emulator, or scan the QR code with Expo Go
```

## Scripts

| Command             | What it does                                                          |
| ------------------- | --------------------------------------------------------------------- |
| `npm start`         | Start the Expo dev server                                             |
| `npm run android`   | Start the dev server and open Android                                 |
| `npm run web`       | Browser preview for quick layout checks (the product targets Android) |
| `npm run typecheck` | TypeScript check                                                      |
| `npm run lint`      | ESLint, including Prettier formatting of code                         |
| `npm run format`    | Format every file with Prettier                                       |
| `npm test`          | Jest tests                                                            |
| `npm run check`     | Everything CI runs: typecheck, lint, format check, tests              |

## Project structure

```text
src/
  app/          # screens (Expo Router): every file is a route
  components/   # shared UI: screen, button, themed-text, themed-view
  constants/    # design tokens: colors (light/dark), spacing, radius
  hooks/        # useTheme
  utils/        # small pure helpers
  __tests__/    # app-level tests (tests never live in src/app)
docs/           # plan and decision records
```

## Conventions

- File names in kebab-case, components in PascalCase, imports from `src` via `@/`.
- Colors only through `useTheme()`. Text colors must meet WCAG AA contrast; a test enforces it.
- Tests live in `__tests__/` folders next to the code, named `*.test.ts(x)`.
- Add packages with `npx expo install <package>` so versions match the Expo SDK.
- More rules for humans and AI agents: [AGENTS.md](AGENTS.md).

The app icon and splash screen are Expo placeholders until Milestone 10.
