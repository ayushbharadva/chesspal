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

export function readPosition(fen: string) {
  const game = new Chess(fen);
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
  const game = new Chess(fen);
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
  const game = new Chess(fen);
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
  };
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
