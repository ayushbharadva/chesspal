import { type ChessColor } from '@/chess';

/** Tactic themes ChessPal trains, named after the Lichess puzzle theme tags. */
export const SKILL_THEMES = [
  'mateIn1',
  'backRankMate',
  'mateIn2',
  'hangingPiece',
  'fork',
  'pin',
  'skewer',
  'discoveredAttack',
] as const;
export type SkillTheme = (typeof SKILL_THEMES)[number];
export const MATE_THEMES: readonly SkillTheme[] = ['mateIn1', 'backRankMate', 'mateIn2'];

/** Beginner (rated under 700), Easy (700–999), Medium (1000–1299), Hard (1300–1599), Expert (1600–1899). */
export const PUZZLE_LEVELS = [1, 2, 3, 4, 5] as const;
export type PuzzleLevel = (typeof PUZZLE_LEVELS)[number];
export const TOP_LEVEL: PuzzleLevel = 5;

/** Keeps a shifted level, such as one level harder, within the levels that exist. */
export function clampLevel(level: number): PuzzleLevel {
  return Math.min(TOP_LEVEL, Math.max(1, level)) as PuzzleLevel;
}

export interface Puzzle {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  level: PuzzleLevel;
  /** The theme this puzzle is taught as. */
  theme: SkillTheme;
  /** Every ChessPal theme the source tags, including `theme`. */
  themes: SkillTheme[];
  goal: string;
  hints: string[];
  explanation: string;
  source: { puzzleId: string; gameUrl: string; license: string };
  verification: { engine: string; depth: number; checkedAt: string };
}

export interface OpeningGuide {
  id: string;
  title: string;
  category: 'Opening' | 'Defence' | 'Gambit';
  side: ChessColor;
  description: string;
  idea: string;
  plans: string[];
  mistakes: string[];
  moves: string[];
  notes: string[];
  sourceUrl: string;
}

export interface OpeningBranch {
  id: string;
  title: string;
  description: string;
  moves: string[];
  notes: string[];
  sourceUrl: string;
}

export interface TransferExercise {
  id: string;
  title: string;
  prompt: string;
  idea: string;
  setupMoves: string[];
  fen: string;
  answers: string[];
  hint: string;
  explanation: string;
  sourceUrl: string;
  verification: {
    engine: string;
    depth: number;
    checkedAt: string;
    bestMove: string;
    bestScoreCp: number;
    answers: { move: string; scoreCp: number; lossCp: number }[];
  };
}

export interface GuideLesson {
  guideId: string;
  branches: OpeningBranch[];
  transfers: TransferExercise[];
}
