import { legalMoves, playMove, positionAfter } from '@/chess';
import { puzzles } from '@/content';
import {
  parseRefutationLine,
  refutationFor,
  refutationsAt,
  refutedPuzzleIds,
} from '@/content/refutations';
import { MATE_THEMES } from '@/content/types';

describe('parseRefutationLine', () => {
  it('reads wrong moves, replies and reasons, including promotions and missing replies', () => {
    const line = parseRefutationLine('f4f5e6f5c g7g8bh7h8e c1c8b7b6d e7e8qf8e8m e2h5g a7a8bs');
    expect(Object.fromEntries(line)).toEqual({
      f4f5: { reply: 'e6f5', reason: 'capture' },
      g7g8b: { reply: 'h7h8', reason: 'escape' },
      c1c8: { reply: 'b7b6', reason: 'defend' },
      e7e8q: { reply: 'f8e8', reason: 'mate' },
      e2h5: { reply: null, reason: 'alsoGood' },
      a7a8b: { reply: null, reason: 'stalemate' },
    });
  });
  it('reads an empty line as no wrong moves and rejects unknown reasons', () => {
    expect(parseRefutationLine('').size).toBe(0);
    expect(() => parseRefutationLine('e2e4e7e5x')).toThrow('Unreadable refutation');
  });
});

it('looks up a stored reply and nothing for answers, odd plies or unknown puzzles', () => {
  const puzzle = puzzles[0];
  const [wrong, refutation] = [...refutationsAt(puzzle.id, 0)!][0];
  expect(refutationFor(puzzle.id, 0, wrong)).toEqual(refutation);
  expect(refutationFor(puzzle.id, 0, puzzle.moves[0])).toBeUndefined();
  expect(refutationsAt(puzzle.id, 1)).toBeUndefined();
  expect(refutationsAt('no-such-puzzle', 0)).toBeUndefined();
});

it('stores every wrong move of every puzzle, and nothing else', () => {
  expect(refutedPuzzleIds().sort()).toEqual(puzzles.map((puzzle) => puzzle.id).sort());
  const problems: string[] = [];
  for (const puzzle of puzzles)
    for (let ply = 0; ply < puzzle.moves.length; ply += 2) {
      const position = positionAfter(puzzle.fen, puzzle.moves, ply);
      const stored = refutationsAt(puzzle.id, ply);
      if (!stored) {
        problems.push(`${puzzle.id} ply ${ply}: no line`);
        continue;
      }
      const legal = new Set(legalMoves(position).map((move) => move.uci));
      for (const wrong of stored.keys())
        if (!legal.has(wrong) || wrong === puzzle.moves[ply])
          problems.push(`${puzzle.id} ply ${ply}: ${wrong} is not a wrong move`);
      // Unstored moves must be the answer or a checkmate, which also counts as correct.
      for (const move of legal)
        if (!stored.has(move) && move !== puzzle.moves[ply] && !playMove(position, move).checkmate)
          problems.push(`${puzzle.id} ply ${ply}: ${move} is missing`);
    }
  expect(problems).toEqual([]);
});

// Playing every reply takes minutes; every eighth puzzle (all levels, as puzzles are sorted by
// rating) checks the script's rules, which apply the same way to every puzzle.
it('stores legal replies with reasons that match the board', () => {
  const problems: string[] = [];
  for (const puzzle of puzzles.filter((_, index) => index % 8 === 0))
    for (let ply = 0; ply < puzzle.moves.length; ply += 2) {
      const position = positionAfter(puzzle.fen, puzzle.moves, ply);
      for (const [wrong, { reply, reason }] of refutationsAt(puzzle.id, ply)!) {
        const label = `${puzzle.id} ply ${ply} ${wrong}`;
        const after = playMove(position, wrong);
        if (after.stalemate || reason === 'stalemate') {
          if (!after.stalemate || reason !== 'stalemate' || reply !== null)
            problems.push(`${label}: stalemate mismatch`);
          continue;
        }
        if (reason === 'alsoGood') {
          if (reply !== null) problems.push(`${label}: alsoGood with a reply`);
          continue;
        }
        if (reply === null) {
          problems.push(`${label}: ${reason} without a reply`);
          continue;
        }
        const answer = playMove(after.fen, reply);
        const escape = MATE_THEMES.includes(puzzle.theme) && answer.piece === 'k';
        const expected = answer.checkmate
          ? 'mate'
          : answer.captured
            ? 'capture'
            : escape
              ? 'escape'
              : 'defend';
        if (reason !== expected) problems.push(`${label}: ${reason}, board says ${expected}`);
      }
    }
  expect(problems).toEqual([]);
});
