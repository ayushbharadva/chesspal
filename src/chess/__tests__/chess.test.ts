import {
  checkingSquares,
  classifyMove,
  describeMove,
  drawReason,
  isDrillPosition,
  isSquareAttacked,
  INITIAL_POSITION,
  legalMoves,
  lineFromSan,
  playDrillMove,
  playMove,
  positionAfter,
  readPosition,
} from '@/chess';

describe('chess rules adapter', () => {
  it('rejects illegal moves and preserves the input position', () => {
    expect(() => playMove(INITIAL_POSITION, 'e2e5')).toThrow();
    expect(readPosition(INITIAL_POSITION).pieces).toHaveLength(32);
    expect(legalMoves(INITIAL_POSITION)).toHaveLength(20);
  });

  it('changes turns and converts a sourced opening line', () => {
    const moves = lineFromSan(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);
    expect(moves).toEqual(['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4']);
    expect(readPosition(positionAfter(INITIAL_POSITION, moves)).turn).toBe('b');
    expect(describeMove(INITIAL_POSITION, 'g1f3')).toBe('Knight to f3');
  });

  it('recognizes checkmate and stalemate', () => {
    const mate = positionAfter(INITIAL_POSITION, lineFromSan(['f3', 'e5', 'g4', 'Qh4#']));
    expect(readPosition(mate).checkmate).toBe(true);
    expect(readPosition('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1').stalemate).toBe(true);
  });

  it('handles castling and disallows castling through check', () => {
    expect(playMove('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'e1g1').san).toBe('O-O');
    expect(() => playMove('r3k2r/8/8/8/2b5/8/8/R3K2R w KQkq - 0 1', 'e1g1')).toThrow();
  });

  it('handles en passant only while the opportunity is available', () => {
    const fen = positionAfter(INITIAL_POSITION, lineFromSan(['e4', 'a6', 'e5', 'd5']));
    expect(playMove(fen, 'e5d6').captured).toBe('p');
    const expired = positionAfter(fen, ['g1f3', 'a6a5']);
    expect(() => playMove(expired, 'e5d6')).toThrow();
  });

  it('allows all promotion choices and requires an explicit choice', () => {
    const fen = '7k/P7/8/8/8/8/8/7K w - - 0 1';
    expect(legalMoves(fen, 'a7').map((move) => move.promotion)).toEqual(
      expect.arrayContaining(['q', 'r', 'b', 'n']),
    );
    expect(playMove(fen, 'a7a8n').san).toContain('=N');
    expect(() => playMove(fen, 'a7a8')).toThrow();
  });
});

describe('classifyMove', () => {
  const classify = (fen: string, uci: string) => classifyMove(fen, playMove(fen, uci).fen);
  const afterMoves = (...moves: string[]) => positionAfter(INITIAL_POSITION, moves);

  it('names ordinary moves, including castling and promotion', () => {
    expect(classify(INITIAL_POSITION, 'e2e4')).toBe('move');
    expect(classify('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'e1g1')).toBe('move');
    expect(classify('8/P7/8/8/8/8/8/1k1K4 w - - 0 1', 'a7a8q')).toBe('move');
  });

  it('names captures, including en passant and capturing promotion', () => {
    expect(classify(afterMoves('e2e4', 'd7d5'), 'e4d5')).toBe('capture');
    expect(classify(afterMoves('e2e4', 'a7a6', 'e4e5', 'd7d5'), 'e5d6')).toBe('capture');
    expect(classify('1n6/P7/8/8/8/8/8/1k1K4 w - - 0 1', 'a7b8n')).toBe('capture');
  });

  it('puts check and checkmate above a capture', () => {
    expect(classify('4k3/8/8/8/8/8/8/R3K3 w - - 0 1', 'a1a8')).toBe('check');
    expect(classify('r3k3/8/8/8/8/8/8/R3K3 w - - 0 1', 'a1a8')).toBe('check');
    expect(classify(afterMoves('f2f3', 'e7e5', 'g2g4'), 'd8h4')).toBe('checkmate');
  });
});

describe('drill boards', () => {
  it('plays a lone piece without kings and keeps the turn with it', () => {
    const fen = '8/8/8/8/8/8/4R3/8 w - - 0 1';
    expect(isDrillPosition(fen)).toBe(true);
    expect(isDrillPosition(INITIAL_POSITION)).toBe(false);
    expect(legalMoves(fen)).toHaveLength(14);
    const after = playDrillMove(fen, 'e2e7');
    expect(after.fen).toBe('8/4R3/8/8/8/8/8/8 w - - 0 1');
    expect(legalMoves(after.fen, 'e7').length).toBeGreaterThan(0);
  });

  it('still refuses illegal moves on a drill board', () => {
    expect(() => playDrillMove('8/8/8/8/3p4/8/4R3/8 w - - 0 1', 'e2d3')).toThrow();
  });

  it('finds attacked squares and the pieces giving check', () => {
    const fen = '8/8/8/3p4/4P3/8/8/8 w - - 0 1';
    expect(isSquareAttacked(fen, 'e4', 'b')).toBe(true);
    expect(isSquareAttacked(fen, 'e5', 'b')).toBe(false);
    expect(checkingSquares('4k3/8/8/1B6/8/8/8/R3K3 b - - 0 1')).toEqual(['b5']);
    expect(checkingSquares(INITIAL_POSITION)).toEqual([]);
  });

  it('names a draw by the rules', () => {
    expect(drawReason('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')).toBe('stalemate');
    expect(drawReason('8/8/4k3/8/8/2K5/8/8 w - - 0 1')).toBe('material');
    expect(drawReason(INITIAL_POSITION)).toBeNull();
  });
});
