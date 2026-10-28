import { puzzles, type Puzzle } from '@/content';
import { checkPuzzleMove } from '@/content/validate';
import { type Attempt, type PracticeMode, type Session } from '@/progress/types';
import { dateKey } from '@/utils/date-key';
import { reviewQueue, reviewSchedule } from '@/workout/review';

export function selectPuzzles(
  attempts: Attempt[],
  mode: PracticeMode,
  count = 10,
  localDate = dateKey(),
) {
  const reviews = reviewQueue(attempts, localDate);
  if (mode === 'review') return reviews.slice(0, count).map((review) => review.puzzleId);

  const history = reviewSchedule(attempts);
  const due = reviews.filter((review) => review.dueDate <= localDate);
  const chosen = due.slice(0, Math.min(3, count)).map((review) => review.puzzleId);
  const pool = puzzles
    .filter((puzzle) => !history.has(puzzle.id))
    .sort((first, second) => first.rating - second.rating);
  const motifs: Puzzle['motif'][] = ['mate', 'capture', 'fork'];
  let freshIndex = 0;
  while (chosen.length < count && pool.length) {
    const preferred = motifs[freshIndex % motifs.length];
    const index = pool.findIndex((puzzle) => puzzle.motif === preferred);
    chosen.push(pool.splice(index < 0 ? 0 : index, 1)[0].id);
    freshIndex += 1;
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
): Session {
  return {
    id,
    mode,
    dateKey: localDate,
    puzzleIds: selectPuzzles(attempts, mode, 10, localDate),
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

export function applyAnswer(session: Session, puzzle: Puzzle, move: string): Session {
  if (session.phase !== 'solve' || session.puzzleIds[session.index] !== puzzle.id) return session;
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
  };
}
