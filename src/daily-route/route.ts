import { puzzles as allPuzzles, type Puzzle } from '@/content';
import { SKILL_THEMES, TOP_LEVEL, type PuzzleLevel, type SkillTheme } from '@/content/types';
import { seededRandom, shuffle } from '@/skills/ladder';
import { dayNumber } from '@/utils/date-key';

export const ROUTE_LENGTH = 5;
/** Squares (zero-based) where the player picks the safe or the steep path. */
export const ROUTE_FORKS = [1, 3] as const;
export const SAFE_POINTS = 2;
export const SAFE_HELPED_POINTS = 1;
export const STEEP_POINTS = 4;
/** The most a route can score: three safe squares and two steep ones. */
export const ROUTE_MAX_SCORE =
  (ROUTE_LENGTH - ROUTE_FORKS.length) * SAFE_POINTS + ROUTE_FORKS.length * STEEP_POINTS;
/** Runs kept for par and best; older ones are dropped. */
export const KEPT_RUNS = 60;
/** A median of fewer runs says little, so par stays hidden until then. */
export const MIN_RUNS_FOR_PAR = 3;

export interface RouteRun {
  dateKey: string;
  score: number;
  steepTaken: number;
  level: PuzzleLevel;
}

/** One theme a day, in a fixed rotation, so the route has a clear focus. */
export function routeTheme(localDate: string): SkillTheme {
  return SKILL_THEMES[dayNumber(localDate) % SKILL_THEMES.length];
}

/** Puzzles matching the filter, without ones already attempted when enough fresh ones remain. */
function preferFresh(
  matching: readonly Puzzle[],
  needed: number,
  attempts: readonly { puzzleId: string }[],
) {
  const seen = new Set(attempts.map((attempt) => attempt.puzzleId));
  const fresh = matching.filter((puzzle) => !seen.has(puzzle.id));
  return fresh.length >= needed ? fresh : matching;
}

/**
 * Today's five puzzles and the two harder ones on offer at the forks, easiest first.
 * Expert players have no level above, so their steep path uses the hardest third of Expert.
 */
export function planRoute(
  localDate: string,
  level: PuzzleLevel,
  attempts: readonly { puzzleId: string }[],
  puzzles: readonly Puzzle[] = allPuzzles,
) {
  const theme = routeTheme(localDate);
  const random = seededRandom(`route|${localDate}|${level}`);
  const tagged = puzzles.filter((puzzle) => puzzle.themes.includes(theme));
  const byRating = (first: Puzzle, second: Puzzle) => first.rating - second.rating;
  const safe = shuffle(
    preferFresh(
      tagged.filter((puzzle) => puzzle.level === level),
      ROUTE_LENGTH,
      attempts,
    ),
    random,
  )
    .slice(0, ROUTE_LENGTH)
    .sort(byRating);
  const chosen = new Set(safe.map((puzzle) => puzzle.id));
  const harder =
    level < TOP_LEVEL
      ? tagged.filter((puzzle) => puzzle.level === level + 1)
      : [...tagged.filter((puzzle) => puzzle.level === TOP_LEVEL)]
          .sort(byRating)
          .slice(-Math.ceil(tagged.filter((puzzle) => puzzle.level === TOP_LEVEL).length / 3));
  const steep = shuffle(
    preferFresh(
      harder.filter((puzzle) => !chosen.has(puzzle.id)),
      ROUTE_FORKS.length,
      attempts,
    ),
    random,
  )
    .slice(0, ROUTE_FORKS.length)
    .sort(byRating);
  return {
    theme,
    puzzleIds: safe.map((puzzle) => puzzle.id),
    steepIds: steep.map((puzzle) => puzzle.id),
  };
}

export function routePoints(steep: boolean, independent: boolean) {
  if (steep) return independent ? STEEP_POINTS : 0;
  return independent ? SAFE_POINTS : SAFE_HELPED_POINTS;
}

export function routeScore(taken: readonly number[], results: readonly { independent: boolean }[]) {
  return results.reduce(
    (total, result, index) => total + routePoints(taken.includes(index), result.independent),
    0,
  );
}

/** The median of earlier runs, so a player races their own form rather than other people. */
export function routePar(runs: readonly RouteRun[], today: string) {
  const scores = runs
    .filter((run) => run.dateKey !== today)
    .map((run) => run.score)
    .sort((first, second) => first - second);
  if (scores.length < MIN_RUNS_FOR_PAR) return null;
  const middle = Math.floor(scores.length / 2);
  return scores.length % 2 ? scores[middle] : (scores[middle - 1] + scores[middle]) / 2;
}

export function bestRun(runs: readonly RouteRun[], excludingDate?: string) {
  const scores = runs.filter((run) => run.dateKey !== excludingDate).map((run) => run.score);
  return scores.length ? Math.max(...scores) : null;
}

/** Keeps one run per date, so finishing a route twice cannot inflate par. */
export function recordRun(runs: readonly RouteRun[], run: RouteRun) {
  return [...runs.filter((item) => item.dateKey !== run.dateKey), run].slice(-KEPT_RUNS);
}

export interface RouteStep {
  state: 'done' | 'current' | 'upcoming';
  fork: boolean;
  steep: boolean;
  points: number | null;
}

/** Display state of the five squares for a route in progress or finished. */
export function routeSteps(
  session: {
    index: number;
    phase: string;
    results: readonly { independent: boolean }[];
    route?: { taken: readonly number[] };
  } | null,
): RouteStep[] {
  return Array.from({ length: ROUTE_LENGTH }, (_, index) => {
    const fork = ROUTE_FORKS.some((item) => item === index);
    const steep = session?.route?.taken.includes(index) ?? false;
    const result = session?.results[index];
    return {
      fork,
      steep,
      state: result ? 'done' : session && index === session.index ? 'current' : 'upcoming',
      points: result ? routePoints(steep, result.independent) : null,
    };
  });
}
