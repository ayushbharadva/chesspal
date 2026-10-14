import { legalMoves, playMove, readPosition } from '@/chess';
import { puzzleById, puzzles } from '@/content';
import { type Attempt } from '@/progress/types';
import { applyAnswer, attemptFor, makeSession, nextPuzzle, selectPuzzles } from '@/workout/session';

const today = '2026-10-13';
function attempt(puzzleId: string, independent: boolean): Attempt {
  return {
    id: puzzleId,
    puzzleId,
    independent,
    dateKey: today,
    completedAt: '2026-10-13T10:00:00.000Z',
  };
}
it('selects ten unique, varied, unseen puzzles', () => {
  const ids = selectPuzzles([], 'daily');
  expect(ids).toHaveLength(10);
  expect(new Set(ids).size).toBe(10);
  expect(new Set(ids.map((id) => puzzleById[id].motif)).size).toBe(3);
  expect(
    selectPuzzles(
      ids.map((id) => attempt(id, true)),
      'extra',
    ).some((id) => ids.includes(id)),
  ).toBe(false);
});
it('reviews the latest assisted attempt and removes corrected items', () => {
  const ids = puzzles.slice(0, 3).map((puzzle) => puzzle.id);
  expect(
    selectPuzzles(
      [
        attempt(ids[0], false),
        attempt(ids[1], false),
        attempt(ids[0], true),
        attempt(ids[2], true),
      ],
      'review',
    ),
  ).toEqual([ids[1]]);
  expect(selectPuzzles([], 'review')).toEqual([]);
});
it('rejects illegal taps and duplicate completion transitions', () => {
  const session = makeSession('test', 'daily', today, []);
  const puzzle = puzzleById[session.puzzleIds[0]];
  expect(applyAnswer(session, puzzle, 'a1a1')).toBe(session);
  let state = session;
  for (let ply = 0; ply < puzzle.moves.length; ply += 2)
    state = applyAnswer(state, puzzle, puzzle.moves[ply]);
  expect(state.phase).toBe('feedback');
  expect(applyAnswer(state, puzzle, puzzle.moves[0])).toBe(state);
  const next = nextPuzzle(state);
  expect(next.index).toBe(1);
  expect(nextPuzzle(next)).toBe(next);
});
it('keeps a hinted multi-move puzzle assisted after the opponent reply', () => {
  const puzzle = puzzles.find((item) => item.moves.length === 3)!;
  const session = {
    ...makeSession('help', 'extra', today, []),
    puzzleIds: [puzzle.id],
    hintsShown: 2,
    usedHelp: true,
  };
  const next = applyAnswer(session, puzzle, puzzle.moves[0]);
  expect(next.ply).toBe(2);
  expect(next.hintsShown).toBe(0);
  expect(attemptFor(next, puzzle.id, new Date()).independent).toBe(false);
});
it('tracks wrong legal attempts separately from independent solves', () => {
  const session = makeSession('wrong', 'daily', today, []);
  const puzzle = puzzleById[session.puzzleIds[0]];
  const other = legalMoves(puzzle.fen).find(
    (move) =>
      move.uci !== puzzle.moves[0] && !readPosition(playMove(puzzle.fen, move.uci).fen).checkmate,
  )!;
  const tried = applyAnswer(session, puzzle, other.uci);
  expect(tried.mistakes).toBe(1);
  expect(attemptFor(tried, puzzle.id, new Date()).independent).toBe(false);
});
