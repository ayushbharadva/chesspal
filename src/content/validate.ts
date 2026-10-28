import { INITIAL_POSITION, playMove, positionAfter, readPosition } from '@/chess';
import { type OpeningGuide, type Puzzle } from '@/content/types';

export function validatePuzzle(puzzle: Puzzle) {
  if (!puzzle.id || !puzzle.moves.length || puzzle.moves.length % 2 !== 1)
    throw new Error('Puzzle must finish on a learner move');
  if (!puzzle.goal || !puzzle.explanation || puzzle.hints.length < 2 || !puzzle.verification.engine)
    throw new Error('Puzzle teaching or verification data missing');
  readPosition(puzzle.fen);
  const final = positionAfter(puzzle.fen, puzzle.moves);
  if (puzzle.motif === 'mate' && !readPosition(final).checkmate)
    throw new Error('Mate puzzle does not end in checkmate');
  return true;
}

export function validateGuide(guide: OpeningGuide) {
  if (
    !guide.moves.length ||
    guide.moves.length !== guide.notes.length ||
    !guide.idea ||
    !guide.sourceUrl
  )
    throw new Error('Incomplete guide');
  positionAfter(INITIAL_POSITION, guide.moves);
  return true;
}

export function checkPuzzleMove(puzzle: Puzzle, ply: number, move: string) {
  if (ply < 0 || ply >= puzzle.moves.length || ply % 2 !== 0)
    return { correct: false, complete: false };
  const fen = positionAfter(puzzle.fen, puzzle.moves, ply);
  try {
    const next = playMove(fen, move);
    const correct = move === puzzle.moves[ply] || next.checkmate;
    return {
      correct,
      complete: correct && (ply === puzzle.moves.length - 1 || next.checkmate),
      fen: next.fen,
    };
  } catch {
    return { correct: false, complete: false };
  }
}
