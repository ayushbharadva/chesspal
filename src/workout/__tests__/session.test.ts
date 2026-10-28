import { legalMoves, playMove, readPosition } from '@/chess';
import { puzzleById, puzzles } from '@/content';
import { type Attempt } from '@/progress/types';
import {
  applyAnswer,
  attemptFor,
  levelMix,
  makeSession,
  nextPuzzle,
  selectPuzzles,
} from '@/workout/session';

const today = '2026-10-13';
function attempt(puzzleId: string, independent: boolean, localDate = today): Attempt {
  return {
    id: puzzleId,
    puzzleId,
    independent,
    dateKey: localDate,
    completedAt: `${localDate}T10:00:00.000Z`,
  };
}
it('selects ten unique, varied, unseen puzzles', () => {
  const ids = selectPuzzles([], 'daily', 10, today);
  expect(ids).toHaveLength(10);
  expect(new Set(ids).size).toBe(10);
  expect(new Set(ids.map((id) => puzzleById[id].theme)).size).toBeGreaterThanOrEqual(6);
  expect(ids.map((id) => puzzleById[id].level)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 2, 2]);
  expect(
    selectPuzzles(
      ids.map((id) => attempt(id, true)),
      'extra',
      10,
      today,
    ).some((id) => ids.includes(id)),
  ).toBe(false);
});
it('mixes two easier, six level and two harder puzzles, easiest first', () => {
  expect(levelMix(10)).toEqual([-1, -1, 0, 0, 0, 0, 0, 0, 1, 1]);
  expect(levelMix(7)).toEqual([-1, 0, 0, 0, 0, 0, 1]);
  const ids = selectPuzzles([], 'daily', 10, today, 2);
  expect(ids.map((id) => puzzleById[id].level)).toEqual([1, 1, 2, 2, 2, 2, 2, 2, 3, 3]);
  expect(selectPuzzles([], 'daily', 10, today, 3).map((id) => puzzleById[id].level)).toEqual([
    2, 2, 3, 3, 3, 3, 3, 3, 3, 3,
  ]);
});
it('includes one fresh puzzle from the weakest theme', () => {
  const pins = puzzles.filter((puzzle) => puzzle.themes.includes('pin')).slice(0, 6);
  const solved = puzzles
    .filter((puzzle) => !puzzle.themes.includes('pin') && puzzle.level === 1)
    .slice(0, 12);
  const attempts = [
    ...pins.map((puzzle) => attempt(puzzle.id, false)),
    ...solved.map((puzzle) => attempt(puzzle.id, true)),
  ];
  const ids = selectPuzzles(attempts, 'extra', 10, today, 1);
  const fresh = ids.filter((id) => !attempts.some((item) => item.puzzleId === id));
  expect(fresh.some((id) => puzzleById[id].themes.includes('pin'))).toBe(true);
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
      10,
      today,
    ),
  ).toEqual([ids[1]]);
  expect(selectPuzzles([], 'review')).toEqual([]);
});

it.each(['daily', 'extra'] as const)(
  'reserves three oldest due reviews in a varied %s workout',
  (mode) => {
    const attempts = puzzles
      .slice(0, 5)
      .map((puzzle, index) =>
        attempt(puzzle.id, true, `2026-10-${String(index + 8).padStart(2, '0')}`),
      );
    const ids = selectPuzzles(attempts, mode, 10, '2026-10-14');
    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
    expect(ids.slice(0, 3)).toEqual(puzzles.slice(0, 3).map((puzzle) => puzzle.id));
    expect(ids.filter((id) => attempts.some((item) => item.puzzleId === id))).toHaveLength(3);
    expect(new Set(ids.slice(3).map((id) => puzzleById[id].theme)).size).toBeGreaterThanOrEqual(5);
    expect(selectPuzzles(attempts, mode, 2, '2026-10-14')).toEqual(ids.slice(0, 2));
  },
);

it('keeps future reviews out of a workout while unseen puzzles are available', () => {
  const attempted = puzzles.slice(0, 20).map((puzzle) => attempt(puzzle.id, true));
  const ids = selectPuzzles(attempted, 'daily', 10, today);
  expect(ids).toHaveLength(10);
  expect(ids.every((id) => !attempted.some((item) => item.puzzleId === id))).toBe(true);
  expect(makeSession('dated', 'daily', today, attempted).puzzleIds).toEqual(ids);
});

it('fills an exhausted fresh pool with familiar puzzles and keeps sessions unlimited', () => {
  const attempted = puzzles.slice(0, -2).map((puzzle) => attempt(puzzle.id, true));
  const ids = selectPuzzles(attempted, 'extra', 10, today);
  expect(ids).toHaveLength(10);
  expect(new Set(ids).size).toBe(10);
  expect(ids.slice(0, 2)).toEqual(
    expect.arrayContaining(puzzles.slice(-2).map((puzzle) => puzzle.id)),
  );
  const allDue = puzzles.map((puzzle) => attempt(puzzle.id, true));
  const repeated = selectPuzzles(allDue, 'extra', 10, '2026-10-14');
  expect(repeated).toHaveLength(10);
  expect(new Set(repeated).size).toBe(10);
});

it('uses remaining due reviews before future reviews after all puzzles have been seen', () => {
  const dueIds = puzzles.slice(0, 20).map((puzzle) => puzzle.id);
  const attempts = puzzles.map((puzzle) =>
    attempt(puzzle.id, true, dueIds.includes(puzzle.id) ? '2026-10-11' : today),
  );
  const ids = selectPuzzles(attempts, 'extra', 10, today);
  expect(ids).toHaveLength(10);
  expect(new Set(ids).size).toBe(10);
  expect(ids.every((id) => dueIds.includes(id))).toBe(true);
});

it('fills a nearly exhausted fresh pool with remaining due reviews before future ones', () => {
  const dueIds = puzzles.slice(0, 20).map((puzzle) => puzzle.id);
  const unseenIds = puzzles.slice(-2).map((puzzle) => puzzle.id);
  const attempts = puzzles
    .slice(0, -2)
    .map((puzzle) => attempt(puzzle.id, true, dueIds.includes(puzzle.id) ? '2026-10-11' : today));
  const ids = selectPuzzles(attempts, 'daily', 10, today);
  expect(ids).toHaveLength(10);
  expect(new Set(ids).size).toBe(10);
  expect(ids.slice(3, 5)).toEqual(expect.arrayContaining(unseenIds));
  expect(ids.every((id) => dueIds.includes(id) || unseenIds.includes(id))).toBe(true);
});

it('caps dedicated review at ten unique eligible puzzles without adding fresh content', () => {
  const attempted = puzzles.slice(0, 15).map((puzzle) => attempt(puzzle.id, true));
  attempted.push(attempt(puzzles[0].id, true));
  const ids = selectPuzzles(attempted, 'review', 10, '2026-10-14');
  expect(ids).toHaveLength(10);
  expect(new Set(ids).size).toBe(10);
  expect(ids.every((id) => attempted.some((item) => item.puzzleId === id))).toBe(true);
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
