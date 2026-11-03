import { Chess, type Square as LibrarySquare } from 'chess.js';

export type Square = LibrarySquare;
export type ChessColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Promotion = 'q' | 'r' | 'b' | 'n';

export const INITIAL_POSITION = new Chess().fen();
export const PIECE_NAMES: Record<PieceType, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

export interface BoardPiece {
  square: Square;
  type: PieceType;
  color: ChessColor;
}

/** Drill boards, such as a lone rook collecting stars, may have no kings; full games must. */
function openGame(fen: string) {
  const board = fen.split(' ')[0];
  return board.includes('K') && board.includes('k')
    ? new Chess(fen)
    : new Chess(fen, { skipValidation: true });
}

export function isDrillPosition(fen: string) {
  const board = fen.split(' ')[0];
  return !board.includes('K') || !board.includes('k');
}

export function readPosition(fen: string) {
  const game = openGame(fen);
  return {
    pieces: game
      .board()
      .flat()
      .filter((piece): piece is NonNullable<typeof piece> => piece !== null),
    turn: game.turn() as ChessColor,
    inCheck: game.isCheck(),
    checkmate: game.isCheckmate(),
    stalemate: game.isStalemate(),
  };
}

export function legalMoves(fen: string, square?: Square) {
  const game = openGame(fen);
  return game.moves({ verbose: true, ...(square ? { square } : {}) }).map((move) => ({
    from: move.from as Square,
    to: move.to as Square,
    promotion: move.promotion as Promotion | undefined,
    uci: `${move.from}${move.to}${move.promotion ?? ''}`,
    san: move.san,
  }));
}

export function playMove(fen: string, uci: string) {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) throw new Error('Invalid move format');
  const game = openGame(fen);
  const move = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  return {
    fen: game.fen(),
    from: move.from as Square,
    to: move.to as Square,
    san: move.san,
    piece: move.piece as PieceType,
    captured: move.captured as PieceType | undefined,
    checkmate: game.isCheckmate(),
    inCheck: game.isCheck(),
    stalemate: game.isStalemate(),
  };
}

/** Plays a move on a drill board and gives the turn back to the mover, whose pieces move alone. */
export function playDrillMove(fen: string, uci: string) {
  const result = playMove(fen, uci);
  return { ...result, fen: withTurn(result.fen, readPosition(fen).turn) };
}

/** The same position with `color` to move, as when asking what that side could do next. */
export function withTurn(fen: string, color: ChessColor) {
  const [board, , castling] = fen.split(' ');
  return `${board} ${color} ${castling} - 0 1`;
}

/** Whether any piece of `color` attacks the square. */
export function isSquareAttacked(fen: string, square: Square, color: ChessColor) {
  return openGame(fen).isAttacked(square, color);
}

/** Squares of the pieces giving check to the side to move. */
export function checkingSquares(fen: string) {
  const game = openGame(fen);
  const king = game
    .board()
    .flat()
    .find((piece) => piece?.type === 'k' && piece.color === game.turn());
  if (!king || !game.isCheck()) return [];
  return game.attackers(king.square, game.turn() === 'w' ? 'b' : 'w') as Square[];
}

/** Why the position is a draw by itself (stalemate, too little material, 50 moves), or null. */
export function drawReason(fen: string) {
  const game = openGame(fen);
  if (game.isStalemate()) return 'stalemate';
  if (game.isInsufficientMaterial()) return 'material';
  if (game.isDrawByFiftyMoves()) return 'fifty';
  return null;
}

export function positionAfter(fen: string, moves: readonly string[], count = moves.length) {
  if (!Number.isInteger(count) || count < 0 || count > moves.length)
    throw new Error('Invalid line position');
  return moves.slice(0, count).reduce((position, move) => playMove(position, move).fen, fen);
}

export function lineFromSan(moves: readonly string[]) {
  const game = new Chess();
  return moves.map((san) => {
    const move = game.move(san);
    return `${move.from}${move.to}${move.promotion ?? ''}`;
  });
}

export function describeMove(fen: string, move: string) {
  const result = playMove(fen, move);
  if (result.san.startsWith('O-O-O')) return 'Castle on the queenside';
  if (result.san.startsWith('O-O')) return 'Castle on the kingside';
  const piece = PIECE_NAMES[result.piece];
  const promotion = move[4] as Promotion | undefined;
  return `${piece[0].toUpperCase()}${piece.slice(1)} ${result.captured ? 'captures on' : 'to'} ${result.to}${promotion ? `, promote to ${PIECE_NAMES[promotion]}` : ''}`;
}

export type MoveKind = 'move' | 'capture' | 'check' | 'checkmate';

/** What a played move did, most significant first, read from the positions either side of it. */
export function classifyMove(before: string, after: string): MoveKind {
  const previous = readPosition(before);
  const current = readPosition(after);
  if (current.checkmate) return 'checkmate';
  if (current.inCheck) return 'check';
  return current.pieces.length < previous.pieces.length ? 'capture' : 'move';
}
