import {
  describeMove,
  INITIAL_POSITION,
  legalMoves,
  lineFromSan,
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
