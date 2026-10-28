import { type Puzzle } from '@/content';
import { SKILL_THEMES, type SkillTheme } from '@/content/types';
import { type Attempt } from '@/progress/types';

export interface ThemeStats {
  theme: SkillTheme;
  attempts: number;
  independent: number;
  assisted: number;
  /** Average puzzle rating, adjusted by how often it was solved without help. */
  performance: number;
}

/** Only recent attempts describe current strength. */
const RECENT_ATTEMPTS = 200;
/** A theme needs this many attempts before it can be called a strength or a weakness. */
export const MIN_THEME_ATTEMPTS = 5;

// Adapted from the Lichess puzzle dashboard: average rating − 500 + 1000 × first-try rate.
function performance(ratingTotal: number, independent: number, attempts: number) {
  return Math.round(ratingTotal / attempts - 500 + (1000 * independent) / attempts);
}

export function themeStats(attempts: Attempt[], puzzleById: Record<string, Puzzle>) {
  const totals = new Map<SkillTheme, { attempts: number; independent: number; rating: number }>();
  let overall = { attempts: 0, independent: 0, rating: 0 };
  for (const attempt of attempts.slice(-RECENT_ATTEMPTS)) {
    const puzzle = puzzleById[attempt.puzzleId];
    if (!puzzle) continue;
    const solved = Number(attempt.independent);
    overall = {
      attempts: overall.attempts + 1,
      independent: overall.independent + solved,
      rating: overall.rating + puzzle.rating,
    };
    for (const theme of puzzle.themes) {
      const total = totals.get(theme) ?? { attempts: 0, independent: 0, rating: 0 };
      totals.set(theme, {
        attempts: total.attempts + 1,
        independent: total.independent + solved,
        rating: total.rating + puzzle.rating,
      });
    }
  }
  const byTheme: ThemeStats[] = SKILL_THEMES.flatMap((theme) => {
    const total = totals.get(theme);
    return total
      ? [
          {
            theme,
            attempts: total.attempts,
            independent: total.independent,
            assisted: total.attempts - total.independent,
            performance: performance(total.rating, total.independent, total.attempts),
          },
        ]
      : [];
  });
  return {
    byTheme,
    overall: overall.attempts
      ? performance(overall.rating, overall.independent, overall.attempts)
      : null,
  };
}

/** Themes clearly above or below the player's overall performance, strongest and weakest first. */
export function strengthsAndWeaknesses(attempts: Attempt[], puzzleById: Record<string, Puzzle>) {
  const { byTheme, overall } = themeStats(attempts, puzzleById);
  if (overall === null) return { strong: [], weak: [] };
  const known = byTheme.filter((stats) => stats.attempts >= MIN_THEME_ATTEMPTS);
  return {
    strong: known
      .filter((stats) => stats.independent >= 3 && stats.performance > overall)
      .sort((first, second) => second.performance - first.performance),
    weak: known
      .filter((stats) => stats.assisted >= 2 && stats.performance < overall)
      .sort((first, second) => first.performance - second.performance),
  };
}
