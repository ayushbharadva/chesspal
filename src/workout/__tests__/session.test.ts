import { legalMoves, playMove, readPosition } from '@/chess';
import { puzzleById, puzzles } from '@/content';
import { type Attempt } from '@/progress/types';
import {
  applyAnswer,
  attemptFor,
  levelMix,
  makeSession,
  nextPuzzle,
  relevelSession,
  restartPuzzle,
  ROUND_SIZE,
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
    2, 2, 3, 3, 3, 3, 3, 3, 4, 4,
  ]);
  // Expert is the top level, so its harder slots stay at Expert.
  expect(selectPuzzles([], 'daily', 10, today, 5).map((id) => puzzleById[id].level)).toEqual([
    4, 4, 5, 5, 5, 5, 5, 5, 5, 5,
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
  const ids = selectPuzzles(attempted, 'daily', ROUND_SIZE, today);
  expect(ids).toHaveLength(5);
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

describe('relevelSession', () => {
  const levels = (ids: string[]) => ids.map((id) => puzzleById[id].level);

  it('swaps unstarted puzzles for the new level and keeps finished ones', () => {
    const session = makeSession('daily', 'daily', today, [], 1);
    const first = puzzleById[session.puzzleIds[0]];
    let played = session;
    for (let ply = 0; ply < first.moves.length; ply += 2)
      played = applyAnswer(played, first, first.moves[ply]);
    const result = attemptFor(played, first.id, new Date(`${today}T10:00:00Z`));
    const finished = nextPuzzle({ ...played, results: [result] });
    const releveled = relevelSession(finished, [result], 5);
    expect(releveled.puzzleIds[0]).toBe(first.id);
    expect(levels(releveled.puzzleIds.slice(1))).toEqual([4, 5, 5, 5]);
    expect(new Set(releveled.puzzleIds).size).toBe(5);
    expect(releveled.index).toBe(1);
  });

  it('keeps the puzzle in progress once a move, hint or mistake has been made', () => {
    const session = makeSession('daily', 'daily', today, [], 1);
    const touched = { ...session, hintsShown: 1, usedHelp: true };
    expect(relevelSession(touched, [], 5).puzzleIds[0]).toBe(session.puzzleIds[0]);
    expect(relevelSession(session, [], 5).puzzleIds[0]).not.toBe(session.puzzleIds[0]);
  });

  it('keeps review puzzles, which belong to the player rather than a level', () => {
    const seen = selectPuzzles([], 'daily', 3, '2026-10-01', 1);
    const history = seen.map((id) => attempt(id, true, '2026-10-01'));
    const session = makeSession('daily', 'daily', today, history, 1);
    const reviews = session.puzzleIds.slice(0, 3);
    expect([...reviews].sort()).toEqual([...seen].sort());
    expect(relevelSession(session, history, 5).puzzleIds.slice(0, 3)).toEqual(reviews);
  });

  it('leaves skill rounds, challenges, reviews and finished rounds alone', () => {
    const skill = makeSession('skill', 'skill', today, [], 1, {
      theme: 'fork',
      rung: 1,
      run: 0,
      level: 1,
    });
    expect(relevelSession(skill, [], 5)).toBe(skill);
    const done = { ...makeSession('daily', 'daily', today, [], 1), phase: 'complete' as const };
    expect(relevelSession(done, [], 5)).toBe(done);
  });
});

it('starts the current puzzle over without forgetting help, and leaves finished ones alone', () => {
  const puzzle = puzzles.find((candidate) => candidate.moves.length >= 3)!;
  const round = { ...makeSession('restart', 'extra', '2026-11-18', []), puzzleIds: [puzzle.id] };
  const midway = {
    ...applyAnswer(round, puzzle, puzzle.moves[0]),
    hintsShown: 2,
    usedHelp: true,
    mistakes: 1,
    lastWrong: true,
  };
  expect(midway.ply).toBe(2);
  expect(restartPuzzle(midway)).toEqual({ ...midway, ply: 0, hintsShown: 0, lastWrong: false });
  expect(restartPuzzle(round)).toBe(round);
  const replay = { ...round, phase: 'replay' as const, ply: 2, hintsShown: 3, usedHelp: true };
  expect(restartPuzzle(replay)).toEqual({ ...replay, ply: 0 });
  const feedback = { ...round, phase: 'feedback' as const };
  expect(restartPuzzle(feedback)).toBe(feedback);
});
