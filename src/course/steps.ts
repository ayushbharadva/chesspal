import {
  drawReason,
  isSquareAttacked,
  legalMoves,
  playDrillMove,
  playMove,
  readPosition,
  type ChessColor,
  type Square,
} from '@/chess';
import { puzzleById, puzzles } from '@/content';
import { type CourseStep } from '@/content/types';

type StepOf<Kind extends CourseStep['kind']> = Extract<CourseStep, { kind: Kind }>;

export interface MoveAnswer {
  accepted: boolean;
  /** The position after the player's move, when it was accepted. */
  fen?: string;
  /** The scripted reply to play next, when the line goes on. */
  reply?: string;
  finished: boolean;
}

/** Checks the player's move at `ply` of a move step; any checkmate is always right. */
export function answerMoveStep(step: StepOf<'move'>, fen: string, ply: number, move: string) {
  const played = playMove(fen, move);
  const lastMove = ply >= step.line.length - 2;
  const accepted =
    move === step.line[ply] ||
    played.checkmate ||
    (lastMove && (step.alsoAccepted ?? []).includes(move));
  if (!accepted) return { accepted: false, finished: false } satisfies MoveAnswer;
  const reply = !played.checkmate && move === step.line[ply] ? step.line[ply + 1] : undefined;
  return {
    accepted: true,
    fen: played.fen,
    reply,
    finished: !reply,
  } satisfies MoveAnswer;
}

/** A star drill move: the new position and the stars still to collect. */
export function collectStar(fen: string, remaining: readonly string[], move: string) {
  const played = playDrillMove(fen, move);
  return {
    fen: played.fen,
    to: played.to,
    remaining: remaining.filter((star) => star !== played.to),
  };
}

function opponent(color: ChessColor): ChessColor {
  return color === 'w' ? 'b' : 'w';
}

export interface CaptureMove {
  safe: boolean;
  fen: string;
  to: Square;
  /** Enemy pieces still on the board after the move. */
  left: number;
}

/** A capture drill move; it is unsafe when an enemy piece could take the moved piece. */
export function captureDrillMove(fen: string, move: string): CaptureMove {
  const side = readPosition(fen).turn;
  const played = playDrillMove(fen, move);
  const left = readPosition(played.fen).pieces.filter((piece) => piece.color !== side).length;
  return {
    safe: left === 0 || !isSquareAttacked(played.fen, played.to, opponent(side)),
    fen: played.fen,
    to: played.to,
    left,
  };
}

/** One slip for finishing a drill over par. */
export function parSlips(moves: number, par: number) {
  return moves > par ? 1 : 0;
}

/** Legal destinations of the piece on `square`, as a tap answer is checked against. */
export function destinations(fen: string, square: Square) {
  return [...new Set(legalMoves(fen, square).map((move) => move.to))].sort();
}

export type PlayOutcome = 'won' | 'drawn' | 'over-limit' | 'ongoing';

/** The state of a play step after the player's `movesMade`th move, before the defender replies. */
export function playOutcome(
  step: StepOf<'play'>,
  fen: string,
  move: string,
  movesMade: number,
): { outcome: PlayOutcome; fen: string } {
  const side = readPosition(fen).turn;
  const played = playMove(fen, move);
  if (played.checkmate) return { outcome: 'won', fen: played.fen };
  if (step.goal === 'promote' && move.length === 5) {
    // A new piece the defender can take for free does not count.
    const safe =
      !isSquareAttacked(played.fen, played.to, opponent(side)) ||
      isSquareAttacked(played.fen, played.to, side);
    return { outcome: safe ? 'won' : 'drawn', fen: played.fen };
  }
  if (drawReason(played.fen)) return { outcome: 'drawn', fen: played.fen };
  if (movesMade >= step.limit) return { outcome: 'over-limit', fen: played.fen };
  return { outcome: 'ongoing', fen: played.fen };
}

/** After the defender's reply: drawn when the player is left without a move or enough material. */
export function replyOutcome(fen: string): PlayOutcome {
  return drawReason(fen) || legalMoves(fen).length === 0 ? 'drawn' : 'ongoing';
}

/** Puzzles for a puzzle step: the theme and level's puzzles, easiest first, moving on with each replay. */
export function coursePuzzles(step: StepOf<'puzzles'>, replay: number) {
  const pool = (
    'ids' in step
      ? step.ids.map((id) => puzzleById[id]).filter(Boolean)
      : puzzles.filter(
          (puzzle) => puzzle.level === step.level && puzzle.themes.includes(step.theme),
        )
  ).sort((first, second) => first.rating - second.rating || first.id.localeCompare(second.id));
  const start = (replay * step.count) % pool.length;
  return Array.from(
    { length: Math.min(step.count, pool.length) },
    (_, index) => pool[(start + index) % pool.length],
  );
}
