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

/** Why a wrong puzzle move fails, as stored in `content/refutations.json`. */
export type RefutationReason = 'stalemate' | 'alsoGood' | 'mate' | 'capture' | 'escape' | 'defend';
/** One letter per reason in the stored file; none of them is a promotion letter (q, r, b, n). */
export const REFUTATION_REASON_LETTERS: Record<RefutationReason, string> = {
  stalemate: 's',
  alsoGood: 'g',
  mate: 'm',
  capture: 'c',
  escape: 'e',
  defend: 'd',
};

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

/** Squares marked on a lesson board: `marks` are tinted, `arrows` run from one square to another. */
export interface BoardMarks {
  marks?: string[];
  arrows?: [string, string][];
}

/** A position fact a `choice` answer must match, checked by tests against chess.js. */
export type ChoiceFact =
  | { status: 'check' | 'checkmate' | 'stalemate' | 'none' }
  | { move: string; legal: boolean }
  /** Whether `square` is attacked (or, for your own piece, protected) by `by`. */
  | { square: string; by: ChessColor; attacked: boolean }
  /** Whether the position is a draw by itself, such as too little material. */
  | { drawn: boolean };

export type CourseStep =
  /** One or two short sentences, with an optional board. */
  | ({ kind: 'read'; text: string; fen?: string; orientation?: ChessColor } & BoardMarks)
  /** Move your pieces onto every star in as few moves as you can. */
  | ({ kind: 'stars'; prompt: string; fen: string; stars: string[]; par: number } & BoardMarks)
  /** Tap every answer square. `destinationsOf` says the answers are that piece's legal moves. */
  | ({
      kind: 'tap';
      prompt: string;
      fen: string;
      answers: string[];
      destinationsOf?: string;
      checkers?: boolean;
      /** The answers are all of one side's pawns of this kind, which tests work out from the board. */
      pawns?: { color: ChessColor; kind: 'isolated' | 'doubled' | 'passed' };
      explanation: string;
    } & BoardMarks)
  /** Pick one answer. */
  | ({
      kind: 'choice';
      prompt: string;
      fen?: string;
      orientation?: ChessColor;
      options: string[];
      answer: number;
      fact?: ChoiceFact;
      explanation: string;
    } & BoardMarks)
  /**
   * Play the line's moves at even plies; odd plies are the scripted replies. On the last move
   * `alsoAccepted` lists other right answers, and any checkmate is always right.
   */
  | ({
      kind: 'move';
      prompt: string;
      fen: string;
      orientation?: ChessColor;
      line: string[];
      alsoAccepted?: string[];
      hint: string;
      explanation: string;
      verification?: { engine: string; depth: number; checkedAt: string };
    } & BoardMarks)
  /** Take every enemy piece; your pieces may not stop on a square an enemy piece attacks. */
  | ({ kind: 'capture'; prompt: string; fen: string; par: number } & BoardMarks)
  /** Beat a simple defender: checkmate it, or promote a pawn, within the move limit. */
  | ({
      kind: 'play';
      prompt: string;
      fen: string;
      orientation?: ChessColor;
      goal: 'checkmate' | 'promote';
      limit: number;
      hint: string;
      /** Moves that beat the defender within the limit; tests replay them. */
      solution: string[];
    } & BoardMarks)
  /**
   * A few bundled puzzles: of one theme and level, or chosen bundled puzzles whose Lichess
   * source tags include `tag` (such as deflection), which tests check against the source rows.
   */
  | ({ kind: 'puzzles'; prompt: string; count: number } & (
      { theme: SkillTheme; level: PuzzleLevel } | { tag: string; ids: string[] }
    ));

export type CourseStepKind = CourseStep['kind'];

export interface CourseLesson {
  id: string;
  title: string;
  steps: CourseStep[];
}

export interface CourseUnit {
  id: string;
  title: string;
  lessons: CourseLesson[];
}

export interface CourseSection {
  id: string;
  title: string;
  /** A one-line description shown above the section on the path. */
  summary: string;
  units: CourseUnit[];
}
