import { legalMoves, playMove, readPosition, withTurn, type Square } from '@/chess';

const CENTER = ['d4', 'e4', 'd5', 'e5'];
const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function distance(from: string, to: string) {
  return Math.max(
    Math.abs(from.charCodeAt(0) - to.charCodeAt(0)),
    Math.abs(Number(from[1]) - Number(to[1])),
  );
}

function allowsMateInOne(fen: string) {
  return legalMoves(fen).some((move) => playMove(fen, move.uci).checkmate);
}

/** How many moves the defender would have if it were to move again. */
function mobility(fen: string) {
  try {
    return legalMoves(withTurn(fen, readPosition(fen).turn === 'w' ? 'b' : 'w')).length;
  } catch {
    return 0;
  }
}

/** The square the player's most advanced pawn is heading for, if there is a pawn. */
function promotionSquare(fen: string, player: 'w' | 'b'): Square | undefined {
  const pawns = readPosition(fen).pieces.filter(
    (piece) => piece.type === 'p' && piece.color === player,
  );
  if (!pawns.length) return undefined;
  const leader = pawns.reduce((best, pawn) =>
    player === 'w'
      ? Number(pawn.square[1]) > Number(best.square[1])
        ? pawn
        : best
      : Number(pawn.square[1]) < Number(best.square[1])
        ? pawn
        : best,
  );
  return `${leader.square[0]}${player === 'w' ? 8 : 1}` as Square;
}

/**
 * A simple defender for play-it-out steps, choosing among chess.js legal moves: take material,
 * avoid mate in one, then keep its king free (against mates) or race to the pawn's path (against
 * promotion). Ties keep the first move in chess.js order, so replies are repeatable.
 */
export function defenderReply(fen: string, goal: 'checkmate' | 'promote') {
  const position = readPosition(fen);
  const player = position.turn === 'w' ? 'b' : 'w';
  const target = goal === 'promote' ? promotionSquare(fen, player) : undefined;
  let best: { uci: string; score: number } | undefined;
  for (const move of legalMoves(fen)) {
    const played = playMove(fen, move.uci);
    let score = (PIECE_VALUES[played.captured ?? 'k'] ?? 0) * 100;
    if (allowsMateInOne(played.fen)) score -= 1000;
    if (target && played.piece === 'k') score -= distance(played.to, target) * 10;
    else if (target) score -= 50;
    else
      score +=
        mobility(played.fen) -
        (played.piece === 'k'
          ? Math.min(...CENTER.map((square) => distance(played.to, square)))
          : 0);
    if (!best || score > best.score) best = { uci: move.uci, score };
  }
  return best?.uci;
}
