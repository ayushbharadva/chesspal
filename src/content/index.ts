import guideData from '../../content/guides.json';
import puzzleData from '../../content/puzzles.json';

import { type OpeningGuide, type Puzzle } from '@/content/types';

export const guides = guideData as OpeningGuide[];
export const puzzles = puzzleData as Puzzle[];
export const puzzleById = Object.fromEntries(
  puzzles.map((puzzle) => [puzzle.id, puzzle]),
) as Record<string, Puzzle>;
export const guideById = Object.fromEntries(guides.map((guide) => [guide.id, guide])) as Record<
  string,
  OpeningGuide
>;

export type { OpeningGuide, Puzzle } from '@/content/types';
