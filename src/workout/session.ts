import { puzzleById, puzzles, type Puzzle } from '@/content';
import { planRoute, ROUTE_FORKS } from '@/daily-route/route';
import { SKILL_THEMES, type PuzzleLevel, type SkillTheme } from '@/content/types';
import { checkPuzzleMove } from '@/content/validate';
import { type Attempt, type PracticeMode, type Session } from '@/progress/types';
import { dateKey } from '@/utils/date-key';
import { pickRung } from '@/skills/ladder';
import { strengthsAndWeaknesses } from '@/skills/themes';
import { reviewQueue, reviewSchedule } from '@/workout/review';

/** Level offsets for fresh puzzles: a fifth easier, a fifth harder, the rest at level (2/6/2 of ten). */
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
  count = 10,
  localDate = dateKey(),
  level: PuzzleLevel = 1,
) {
  const reviews = reviewQueue(attempts, localDate);
  if (mode === 'review') return reviews.slice(0, count).map((review) => review.puzzleId);

  const history = reviewSchedule(attempts);
  const due = reviews.filter((review) => review.dueDate <= localDate);
  const chosen = due.slice(0, Math.min(3, count)).map((review) => review.puzzleId);
  const pool = puzzles
    .filter((puzzle) => !history.has(puzzle.id))
    .sort((first, second) => first.rating - second.rating);
  const weakest = strengthsAndWeaknesses(attempts, puzzleById).weak[0]?.theme;
  const clamp = (offset: number) => Math.min(3, Math.max(1, level + offset));
  // Rotate themes for variety, starting from a different theme as history grows.
  let themeIndex = history.size;
  let weakSlotUsed = !weakest;
  for (const offset of levelMix(count - chosen.length)) {
    if (!pool.length) break;
    const target = clamp(offset);
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

export function makeSession(
  id: string,
  mode: PracticeMode,
  localDate: string,
  attempts: Attempt[],
  level: PuzzleLevel = 1,
  skill?: Session['skill'],
): Session {
  const puzzleIds = skill
    ? (pickRung(skill.theme, level, skill.rung, skill.run) ?? [])
    : selectPuzzles(attempts, mode, 10, localDate, level);
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
