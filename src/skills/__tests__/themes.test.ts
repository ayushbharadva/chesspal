import { puzzleById, puzzles } from '@/content';
import { type Attempt } from '@/progress/types';
import { MIN_THEME_ATTEMPTS, strengthsAndWeaknesses, themeStats } from '@/skills/themes';

function attempt(puzzleId: string, independent: boolean, index: number): Attempt {
  return {
    id: `${puzzleId}-${index}`,
    puzzleId,
    independent,
    dateKey: '2026-10-20',
    completedAt: `2026-10-20T10:${String(index % 60).padStart(2, '0')}:00.000Z`,
  };
}
const only = (theme: string) =>
  puzzles.filter((puzzle) => puzzle.themes.length === 1 && puzzle.theme === theme);

it('counts every tagged theme and ignores puzzles that are no longer bundled', () => {
  const puzzle = puzzles.find((item) => item.themes.length > 1)!;
  const { byTheme, overall } = themeStats(
    [attempt(puzzle.id, true, 0), attempt('removed-puzzle', false, 1)],
    puzzleById,
  );
  expect(byTheme.map((stats) => stats.theme).sort()).toEqual([...puzzle.themes].sort());
  expect(byTheme.every((stats) => stats.attempts === 1 && stats.independent === 1)).toBe(true);
  expect(overall).toBe(puzzle.rating - 500 + 1000);
});

it('names a weak and a strong theme only with enough evidence', () => {
  const forks = only('fork').slice(0, MIN_THEME_ATTEMPTS);
  const pins = only('pin').slice(0, MIN_THEME_ATTEMPTS);
  const attempts = [
    ...forks.map((puzzle, index) => attempt(puzzle.id, true, index)),
    ...pins.map((puzzle, index) => attempt(puzzle.id, index === 0, index + 10)),
  ];
  const { strong, weak } = strengthsAndWeaknesses(attempts, puzzleById);
  expect(strong.map((stats) => stats.theme)).toEqual(['fork']);
  expect(weak.map((stats) => stats.theme)).toEqual(['pin']);
  const tooFew = strengthsAndWeaknesses(attempts.slice(0, 3), puzzleById);
  expect(tooFew).toEqual({ strong: [], weak: [] });
  expect(strengthsAndWeaknesses([], puzzleById)).toEqual({ strong: [], weak: [] });
});
