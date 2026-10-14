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
