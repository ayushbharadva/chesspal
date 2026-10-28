import { type ChessColor } from '@/chess';

export interface Puzzle {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  motif: 'mate' | 'capture' | 'fork';
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
