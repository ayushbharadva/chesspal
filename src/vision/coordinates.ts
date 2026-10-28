import { type ChessColor, type Square } from '@/chess';

export const ROUND_SECONDS = 30;
/** Scores kept per side for the recent trend; older ones are dropped. */
export const KEPT_SCORES = 20;

export const ALL_SQUARES = 'abcdefgh'
  .split('')
  .flatMap((file) => '12345678'.split('').map((rank) => `${file}${rank}` as Square));

export interface VisionScores {
  w: number[];
  b: number[];
}

export function emptyVisionScores(): VisionScores {
  return { w: [], b: [] };
}

/** A random square, never the same as the previous target. */
export function nextTarget(previous: Square | null, random: () => number = Math.random): Square {
  const choices = ALL_SQUARES.filter((square) => square !== previous);
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}

export function recordScore(scores: VisionScores, side: ChessColor, score: number): VisionScores {
  return { ...scores, [side]: [...scores[side], score].slice(-KEPT_SCORES) };
}

export function bestScore(scores: VisionScores, side?: ChessColor) {
  const all = side ? scores[side] : [...scores.w, ...scores.b];
  return all.length ? Math.max(...all) : null;
}

/** Whole seconds left in a round that started at `startedAt`, never below zero. */
export function secondsLeft(startedAt: number, now: number) {
  return Math.max(0, ROUND_SECONDS - Math.floor((now - startedAt) / 1000));
}
