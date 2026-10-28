import { legalMoves, playMove, positionAfter, readPosition } from '@/chess';
import { guides, puzzles, type Puzzle } from '@/content';
import { skillById, skills, skillUnits } from '@/content/skills';
import { PUZZLE_LEVELS, SKILL_THEMES } from '@/content/types';
import { checkPuzzleMove, validateGuide, validatePuzzle } from '@/content/validate';
import { MIN_RUNG_POOL } from '@/skills/ladder';

it('ships about a thousand distinct engine-verified puzzles with valid complete lines', () => {
  expect(puzzles.length).toBeGreaterThanOrEqual(1000);
  expect(new Set(puzzles.map((puzzle) => puzzle.id)).size).toBe(puzzles.length);
  expect(new Set(puzzles.map((puzzle) => puzzle.fen)).size).toBe(puzzles.length);
  for (const puzzle of puzzles) {
    expect(validatePuzzle(puzzle)).toBe(true);
    expect(puzzle.verification.depth).toBeGreaterThanOrEqual(14);
    for (let ply = 0; ply < puzzle.moves.length; ply += 2)
      expect(checkPuzzleMove(puzzle, ply, puzzle.moves[ply]).correct).toBe(true);
  }
});
it('covers every theme at every level with enough puzzles for skill ladders', () => {
  for (const theme of SKILL_THEMES)
    for (const level of PUZZLE_LEVELS)
      expect(
        puzzles.filter((puzzle) => puzzle.level === level && puzzle.themes.includes(theme)).length,
      ).toBeGreaterThanOrEqual(MIN_RUNG_POOL);
  for (const puzzle of puzzles)
    expect(puzzle.level).toBe(puzzle.rating < 700 ? 1 : puzzle.rating < 1000 ? 2 : 3);
});
it('describes every theme once with original teaching copy', () => {
  expect(skills.map((skill) => skill.id).sort()).toEqual([...SKILL_THEMES].sort());
  expect(skillUnits.flatMap((unit) => unit.skills).sort()).toEqual([...SKILL_THEMES].sort());
  for (const theme of SKILL_THEMES) {
    const skill = skillById[theme];
    for (const text of [
      skill.name,
      skill.summary,
      skill.card,
      skill.lookFor,
      skill.goal,
      skill.hint,
    ])
      expect(text.trim().length).toBeGreaterThan(3);
  }
});
it('validates all three sourced opening guides', () => {
  expect(guides.map((guide) => guide.category)).toEqual(['Opening', 'Defence', 'Gambit']);
  for (const guide of guides) expect(validateGuide(guide)).toBe(true);
});
it('rejects illegal and non-solution moves and invalid content', () => {
  const puzzle = puzzles.find((item) => item.theme === 'hangingPiece')!;
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
    theme: 'mateIn1',
    themes: ['mateIn1'],
  };
  expect(readPosition(positionAfter(fixture.fen, ['f7h7'])).checkmate).toBe(true);
  expect(checkPuzzleMove(fixture, 0, 'f7h7')).toMatchObject({ correct: true, complete: true });
});
