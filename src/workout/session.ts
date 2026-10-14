import { puzzles, type Puzzle } from '@/content';
import { checkPuzzleMove } from '@/content/validate';
import { type Attempt, type PracticeMode, type Session } from '@/progress/types';
import { dateKey } from '@/utils/date-key';

export function latestAttempts(attempts: Attempt[]) {
  return new Map(attempts.map((attempt) => [attempt.puzzleId, attempt]));
}

export function selectPuzzles(attempts: Attempt[], mode: PracticeMode, count = 10) {
  const history = latestAttempts(attempts);
  const candidates =
    mode === 'review'
      ? puzzles.filter((puzzle) => history.has(puzzle.id) && !history.get(puzzle.id)!.independent)
      : [...puzzles];
  candidates.sort((first, second) => {
    const firstAttempt = history.get(first.id);
    const secondAttempt = history.get(second.id);
    const firstPriority = !firstAttempt ? 0 : firstAttempt.independent ? 2 : 1;
    const secondPriority = !secondAttempt ? 0 : secondAttempt.independent ? 2 : 1;
    return (
      firstPriority - secondPriority ||
      (firstAttempt?.completedAt ?? '').localeCompare(secondAttempt?.completedAt ?? '') ||
      first.rating - second.rating
    );
  });
  const chosen: string[] = [];
  const pool = [...candidates];
  const motifs: Puzzle['motif'][] = ['mate', 'capture', 'fork'];
  while (chosen.length < count && pool.length) {
    const preferred = motifs[chosen.length % motifs.length];
    const index = pool.findIndex((puzzle) => puzzle.motif === preferred && !history.has(puzzle.id));
    chosen.push(pool.splice(index < 0 ? 0 : index, 1)[0].id);
  }
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
    puzzleIds: selectPuzzles(attempts, mode),
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
