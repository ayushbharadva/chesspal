import { legalMoves, playMove, positionAfter, readPosition } from '@/chess';
import { guides, puzzles, type Puzzle } from '@/content';
import { checkPuzzleMove, validateGuide, validatePuzzle } from '@/content/validate';

it('ships 100 distinct engine-verified starter puzzles with valid complete lines', () => {
  expect(puzzles).toHaveLength(100);
  expect(new Set(puzzles.map((puzzle) => puzzle.id)).size).toBe(puzzles.length);
  expect(new Set(puzzles.map((puzzle) => puzzle.fen)).size).toBe(puzzles.length);
  expect(new Set(puzzles.map((puzzle) => puzzle.motif))).toEqual(
    new Set(['mate', 'capture', 'fork']),
  );
  for (const puzzle of puzzles) {
    expect(validatePuzzle(puzzle)).toBe(true);
    expect(puzzle.verification.depth).toBeGreaterThanOrEqual(14);
    for (let ply = 0; ply < puzzle.moves.length; ply += 2)
      expect(checkPuzzleMove(puzzle, ply, puzzle.moves[ply]).correct).toBe(true);
  }
});
it('validates all three sourced opening guides', () => {
  expect(guides.map((guide) => guide.category)).toEqual(['Opening', 'Defence', 'Gambit']);
  for (const guide of guides) expect(validateGuide(guide)).toBe(true);
});
it('rejects illegal and non-solution moves and invalid content', () => {
  const puzzle = puzzles.find((item) => item.motif === 'capture')!;
  expect(checkPuzzleMove(puzzle, 0, 'a1a1')).toEqual({ correct: false, complete: false });
  const other = legalMoves(puzzle.fen).find(
    (move) =>
      move.uci !== puzzle.moves[0] && !readPosition(playMove(puzzle.fen, move.uci).fen).checkmate,
  )!;
  expect(checkPuzzleMove(puzzle, 0, other.uci)).toMatchObject({ complete: false, correct: false });
  expect(() => validatePuzzle({ ...puzzle, moves: ['a1a1'] })).toThrow();
  expect(() => validateGuide({ ...guides[0], notes: [] })).toThrow();
});
it('accepts an alternative legal mate rather than only the saved move', () => {
  const fixture: Puzzle = {
    ...puzzles[0],
    fen: '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1',
    moves: ['f7f8'],
    motif: 'mate',
  };
  expect(readPosition(positionAfter(fixture.fen, ['f7h7'])).checkmate).toBe(true);
  expect(checkPuzzleMove(fixture, 0, 'f7h7')).toMatchObject({ correct: true, complete: true });
});
