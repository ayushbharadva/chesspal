import { puzzleById, puzzles, type Puzzle } from '@/content';
import { planRoute, ROUTE_FORKS } from '@/daily-route/route';
import { clampLevel, SKILL_THEMES, type PuzzleLevel, type SkillTheme } from '@/content/types';
import { checkPuzzleMove } from '@/content/validate';
import { type Attempt, type PracticeMode, type Session } from '@/progress/types';
import { dateKey } from '@/utils/date-key';
import { pickRung } from '@/skills/ladder';
import { strengthsAndWeaknesses } from '@/skills/themes';
import { reviewQueue, reviewSchedule } from '@/workout/review';

/** Puzzles in a practice or review round. Skill rounds and the daily challenge set their own length. */
export const ROUND_SIZE = 5;

/** Level offsets for fresh puzzles: a fifth easier, a fifth harder, the rest at level (1/3/1 of five). */
export function levelMix(slots: number) {
  const outer = Math.round(slots / 5);
  return [
    ...Array<number>(outer).fill(-1),
    ...Array<number>(Math.max(0, slots - 2 * outer)).fill(0),
    ...Array<number>(outer).fill(1),
  ];
}

export function selectPuzzles(
  attempts: Attempt[],
  mode: PracticeMode,
  count = ROUND_SIZE,
  localDate = dateKey(),
  level: PuzzleLevel = 1,
) {
  const reviews = reviewQueue(attempts, localDate);
  if (mode === 'review') return reviews.slice(0, count).map((review) => review.puzzleId);

  const history = reviewSchedule(attempts);
  const due = reviews.filter((review) => review.dueDate <= localDate);
  const chosen = due.slice(0, Math.min(3, count)).map((review) => review.puzzleId);
  chosen.push(...pickFresh(attempts, count - chosen.length, level));

  // When fresh puzzles run out, finish with overdue reviews before revisiting familiar puzzles.
  const familiar = puzzles.filter(
    (puzzle) => history.has(puzzle.id) && !chosen.includes(puzzle.id),
  );
  familiar.sort((first, second) => {
    const firstReview = history.get(first.id)!;
    const secondReview = history.get(second.id)!;
    const firstDue = firstReview.dueDate <= localDate;
    const secondDue = secondReview.dueDate <= localDate;
    return (
      Number(secondDue) - Number(firstDue) ||
      firstReview.dueDate.localeCompare(secondReview.dueDate) ||
      first.rating - second.rating
    );
  });
  chosen.push(...familiar.slice(0, count - chosen.length).map((puzzle) => puzzle.id));
  return chosen;
}

/**
 * Unplayed puzzles in the level mix, easiest first, with one at-level slot for the weakest theme.
 * Puzzles in `exclude` are skipped, so a round never holds the same puzzle twice.
 */
function pickFresh(
  attempts: Attempt[],
  count: number,
  level: PuzzleLevel,
  exclude: ReadonlySet<string> = new Set(),
) {
  const history = reviewSchedule(attempts);
  const pool = puzzles
    .filter((puzzle) => !history.has(puzzle.id) && !exclude.has(puzzle.id))
    .sort((first, second) => first.rating - second.rating);
  const weakest = strengthsAndWeaknesses(attempts, puzzleById).weak[0]?.theme;
  const chosen: string[] = [];
  // Rotate themes for variety, starting from a different theme as history grows.
  let themeIndex = history.size;
  let weakSlotUsed = !weakest;
  for (const offset of levelMix(count)) {
    if (!pool.length) break;
    const target = clampLevel(level + offset);
    const useWeak = !weakSlotUsed && offset === 0;
    if (useWeak) weakSlotUsed = true;
    const preferred: SkillTheme = useWeak
      ? weakest!
      : SKILL_THEMES[themeIndex++ % SKILL_THEMES.length];
    const candidates = [
      (puzzle: Puzzle) => puzzle.level === target && puzzle.themes.includes(preferred),
      (puzzle: Puzzle) => puzzle.level === target,
      (puzzle: Puzzle) => Math.abs(puzzle.level - target) === 1,
      () => true,
    ];
    const index = candidates.map((matches) => pool.findIndex(matches)).find((found) => found >= 0)!;
    chosen.push(pool.splice(index, 1)[0].id);
  }
  return chosen;
}

/**
 * After a level change, swaps the practice puzzles not yet started for fresh ones at the new level.
 * Finished puzzles, the one in progress and review puzzles stay. Skill rounds, daily challenges
 * and review rounds keep their puzzles.
 */
export function relevelSession(session: Session, attempts: Attempt[], level: PuzzleLevel): Session {
  if ((session.mode !== 'daily' && session.mode !== 'extra') || session.phase === 'complete')
    return session;
  const started =
    session.phase !== 'solve' || session.ply > 0 || session.hintsShown > 0 || session.mistakes > 0;
  const kept = session.puzzleIds.slice(0, session.index + (started ? 1 : 0));
  const history = reviewSchedule(attempts);
  const rest = session.puzzleIds.slice(kept.length);
  const reviews = rest.filter((id) => history.has(id));
  const unplayed = rest.filter((id) => !history.has(id));
  const fresh = pickFresh(attempts, unplayed.length, level, new Set(session.puzzleIds));
  // If fresh puzzles run short, keep enough of the old ones to finish the round.
  const puzzleIds = [...kept, ...reviews, ...fresh, ...unplayed.slice(fresh.length)];
  return { ...session, puzzleIds };
}

export function makeSession(
  id: string,
  mode: PracticeMode,
  localDate: string,
  attempts: Attempt[],
  level: PuzzleLevel = 1,
  skill?: Session['skill'],
): Session {
  const puzzleIds = skill
    ? (pickRung(skill.theme, skill.level, skill.rung, skill.run) ?? [])
    : selectPuzzles(attempts, mode, ROUND_SIZE, localDate, level);
  return {
    id,
    mode,
    dateKey: localDate,
    puzzleIds,
    ...(skill ? { skill } : {}),
    index: 0,
    ply: 0,
    phase: 'solve',
    hintsShown: 0,
    usedHelp: false,
    mistakes: 0,
    lastWrong: false,
    acceptedFen: null,
    acceptedMove: null,
    results: [],
  };
}

export function makeRouteSession(
  id: string,
  localDate: string,
  attempts: Attempt[],
  level: PuzzleLevel = 1,
): Session {
  const plan = planRoute(localDate, level, attempts);
  return {
    ...makeSession(id, 'route', localDate, attempts, level),
    puzzleIds: plan.puzzleIds,
    route: { theme: plan.theme, steepIds: plan.steepIds, taken: [], choosing: false },
  };
}

/** Answers the fork at the current square; the steep path swaps in the harder puzzle. */
export function chooseFork(session: Session, steep: boolean): Session {
  if (!session.route?.choosing) return session;
  const fork = ROUTE_FORKS.findIndex((index) => index === session.index);
  if (fork < 0) return session;
  const route = { ...session.route, choosing: false };
  if (!steep) return { ...session, route };
  const puzzleIds = [...session.puzzleIds];
  puzzleIds[session.index] = session.route.steepIds[fork];
  return {
    ...session,
    puzzleIds,
    route: { ...route, taken: [...route.taken, session.index] },
  };
}

export function applyAnswer(session: Session, puzzle: Puzzle, move: string): Session {
  if (
    session.phase !== 'solve' ||
    session.route?.choosing ||
    session.puzzleIds[session.index] !== puzzle.id
  )
    return session;
  const result = checkPuzzleMove(puzzle, session.ply, move);
  if (!result.fen) return session;
  if (!result.correct) return { ...session, mistakes: session.mistakes + 1, lastWrong: true };
  if (result.complete)
    return {
      ...session,
      phase: 'feedback',
      acceptedFen: result.fen,
      acceptedMove: move,
      lastWrong: false,
    };
  return { ...session, ply: session.ply + 2, hintsShown: 0, lastWrong: false };
}

export function attemptFor(session: Session, puzzleId: string, now: Date): Attempt {
  return {
    id: `${session.id}:${session.index}`,
    puzzleId,
    independent: !session.usedHelp && session.mistakes === 0 && session.phase !== 'replay',
    dateKey: dateKey(now),
    completedAt: now.toISOString(),
  };
}

/**
 * Starts the current puzzle again from its first move, as when the player leaves a round part-way.
 * Mistakes and help stay, so starting over never turns a helped solve into one without help.
 */
export function restartPuzzle(session: Session): Session {
  if (session.phase !== 'solve' && session.phase !== 'replay') return session;
  // Show answer counts as help, so a replay starts over as a replay.
  const hintsShown = session.phase === 'replay' ? 3 : 0;
  if (session.ply === 0 && session.hintsShown === hintsShown && !session.lastWrong) return session;
  return { ...session, ply: 0, hintsShown, lastWrong: false };
}

export function nextPuzzle(session: Session): Session {
  if (session.phase !== 'feedback') return session;
  const index = session.index + 1;
  return {
    ...session,
    index,
    ply: 0,
    phase: index >= session.puzzleIds.length ? 'complete' : 'solve',
    hintsShown: 0,
    usedHelp: false,
    mistakes: 0,
    lastWrong: false,
    acceptedFen: null,
    acceptedMove: null,
    ...(session.route
      ? { route: { ...session.route, choosing: ROUTE_FORKS.some((fork) => fork === index) } }
      : {}),
  };
}
