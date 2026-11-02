import { puzzles as allPuzzles, type Puzzle } from '@/content';
import { clampLevel, SKILL_THEMES, type PuzzleLevel, type SkillTheme } from '@/content/types';

export type Rung = 1 | 2 | 3;
export const RUNGS: readonly Rung[] = [1, 2, 3];
export const RUNG_NAMES: Record<Rung, string> = { 1: 'Warm-up', 2: 'At your level', 3: 'The test' };
export const RUNG_SIZE = 5;
/** Independent solves needed to clear a rung. */
export const RUNG_PASS = 4;
/** The test hides this many puzzles from other themes among the target ones. */
export const TEST_FOILS = 2;
/** Smallest pool a rung may draw from, so retries do not repeat the same five puzzles. */
export const MIN_RUNG_POOL = 10;

export interface SkillProgress {
  cleared: Rung[];
  runs: number;
}
/** Progress is kept for each level, so rounds passed at one level never count at another. */
export type SkillProgressByLevel = Partial<
  Record<PuzzleLevel, Partial<Record<SkillTheme, SkillProgress>>>
>;

/** Warm-up is one level below the player, the test one level above, within the levels that exist. */
export function rungLevel(level: PuzzleLevel, rung: Rung): PuzzleLevel {
  return clampLevel(level + rung - 2);
}

/** Puzzles tagged with a theme at a level, borrowing neighbouring levels when the pool is thin. */
export function rungPool(theme: SkillTheme, level: PuzzleLevel, puzzles = allPuzzles) {
  const at = (target: number) =>
    puzzles.filter((puzzle) => puzzle.level === target && puzzle.themes.includes(theme));
  let pool = at(level);
  if (pool.length < MIN_RUNG_POOL) pool = pool.concat(at(level - 1));
  if (pool.length < MIN_RUNG_POOL) pool = pool.concat(at(level + 1));
  return pool.length >= MIN_RUNG_POOL
    ? pool.sort((first, second) => compareIds(first, second))
    : [];
}

function compareIds(first: Puzzle, second: Puzzle) {
  return first.id < second.id ? -1 : first.id > second.id ? 1 : 0;
}

// FNV-1a string hash and the mulberry32 generator: small, well-known, deterministic.
function hash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}
export function seededRandom(seed: string) {
  let state = hash(seed);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle<Item>(items: readonly Item[], random: () => number) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

/**
 * Five puzzle ids for one run of a rung, or null when content is too thin.
 * Each run number gives a different selection. The test mixes three target puzzles
 * with two from other themes, so the player must recognise the idea without a label.
 */
export function pickRung(
  theme: SkillTheme,
  level: PuzzleLevel,
  rung: Rung,
  run: number,
  puzzles = allPuzzles,
) {
  const tier = rungLevel(level, rung);
  const pool = rungPool(theme, tier, puzzles);
  if (!pool.length) return null;
  const random = seededRandom(`rung|${theme}|${level}|${rung}|${run}`);
  const targets = shuffle(pool, random).slice(0, rung === 3 ? RUNG_SIZE - TEST_FOILS : RUNG_SIZE);
  if (rung !== 3) return targets.length === RUNG_SIZE ? targets.map((puzzle) => puzzle.id) : null;
  const used = new Set(targets.map((puzzle) => puzzle.id));
  const foils = SKILL_THEMES.filter((other) => other !== theme)
    .flatMap((other) => rungPool(other, tier, puzzles))
    .filter((puzzle) => !puzzle.themes.includes(theme) && !used.has(puzzle.id))
    .filter((puzzle, index, list) => list.findIndex((item) => item.id === puzzle.id) === index);
  if (foils.length < TEST_FOILS) return null;
  return shuffle([...targets, ...shuffle(foils, random).slice(0, TEST_FOILS)], random).map(
    (puzzle) => puzzle.id,
  );
}

export function availableRungs(theme: SkillTheme, level: PuzzleLevel, puzzles = allPuzzles) {
  return RUNGS.filter((rung) => pickRung(theme, level, rung, 0, puzzles) !== null);
}

export function rungCleared(independentSolves: number) {
  return independentSolves >= RUNG_PASS;
}

/** Mastery needs every available rung, including the unlabelled test. Cued rungs alone never count. */
export function skillMastered(progress: SkillProgress | undefined, available: readonly Rung[]) {
  return (
    available.includes(3) && available.every((rung) => progress?.cleared.includes(rung) ?? false)
  );
}
