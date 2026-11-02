import { puzzleById, puzzles } from '@/content';
import { SKILL_THEMES } from '@/content/types';
import {
  availableRungs,
  MIN_RUNG_POOL,
  pickRung,
  RUNG_SIZE,
  rungCleared,
  rungLevel,
  rungPool,
  skillMastered,
} from '@/skills/ladder';

it('places the warm-up below the player and the test above, within levels 1–5', () => {
  expect([1, 2, 3].map((rung) => rungLevel(2, rung as 1 | 2 | 3))).toEqual([1, 2, 3]);
  expect([1, 2, 3].map((rung) => rungLevel(4, rung as 1 | 2 | 3))).toEqual([3, 4, 5]);
  expect(rungLevel(1, 1)).toBe(1);
  expect(rungLevel(5, 3)).toBe(5);
});

it('picks five fresh themed puzzles per run, deterministically', () => {
  const first = pickRung('fork', 1, 1, 0)!;
  expect(first).toHaveLength(RUNG_SIZE);
  expect(new Set(first).size).toBe(RUNG_SIZE);
  expect(first.every((id) => puzzleById[id].themes.includes('fork'))).toBe(true);
  expect(first.every((id) => puzzleById[id].level === 1)).toBe(true);
  expect(pickRung('fork', 1, 1, 0)).toEqual(first);
  expect(pickRung('fork', 1, 1, 1)).not.toEqual(first);
});

it('hides two puzzles from other themes in the test round', () => {
  for (const theme of SKILL_THEMES) {
    const test = pickRung(theme, 2, 3, 4)!;
    expect(test).toHaveLength(RUNG_SIZE);
    expect(test.filter((id) => puzzleById[id].themes.includes(theme))).toHaveLength(3);
    expect(test.every((id) => puzzleById[id].level === 3)).toBe(true);
  }
});

it('borrows a neighbouring level when a pool is thin and refuses an empty one', () => {
  const skewers = puzzles.filter((puzzle) => puzzle.themes.includes('skewer'));
  const levelOne = skewers.filter((puzzle) => puzzle.level === 1).slice(0, 4);
  const levelTwo = skewers.filter((puzzle) => puzzle.level === 2).slice(0, 8);
  const pool = rungPool('skewer', 1, [...levelOne, ...levelTwo]);
  expect(pool).toHaveLength(12);
  expect(pool.filter((puzzle) => puzzle.level === 2)).toHaveLength(8);
  expect(rungPool('skewer', 1, levelOne)).toEqual([]);
  expect(availableRungs('skewer', 1, levelOne)).toEqual([]);
  expect(MIN_RUNG_POOL).toBeGreaterThan(levelOne.length);
});

it('clears a rung with four of five and requires the test for mastery', () => {
  expect(rungCleared(4)).toBe(true);
  expect(rungCleared(3)).toBe(false);
  expect(skillMastered({ cleared: [1, 2], runs: 2 }, [1, 2, 3])).toBe(false);
  expect(skillMastered({ cleared: [1, 2, 3], runs: 3 }, [1, 2, 3])).toBe(true);
  expect(skillMastered({ cleared: [1, 2], runs: 2 }, [1, 2])).toBe(false);
  expect(skillMastered(undefined, [1, 2, 3])).toBe(false);
});
