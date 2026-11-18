import { describeMove, PIECE_NAMES, playMove, positionAfter, readPosition } from '@/chess';
import { type Refutation } from '@/content/refutations';
import { skillById } from '@/content/skills';
import { MATE_THEMES, type Puzzle } from '@/content/types';

const GENERAL_CUE = 'Look for checks, captures and threats.';

/**
 * One line saying why a wrong move fails, built from its stored reply. When a round hides the
 * puzzle's theme, the line gives no hint of it: no "not checkmate", no theme cue.
 */
export function wrongMoveMessage(
  puzzle: Puzzle,
  ply: number,
  wrongMove: string,
  { reply, reason }: Refutation,
  themeNamed: boolean,
) {
  if (reason === 'stalemate') return "That's stalemate, a draw. Give the king a square.";
  if (reason === 'alsoGood') return "Good move, but there's a stronger one.";
  const position = playMove(positionAfter(puzzle.fen, puzzle.moves, ply), wrongMove).fen;
  const answer = playMove(position, reply!);
  const opponent = readPosition(position).turn === 'w' ? 'White' : 'Black';
  const mate = themeNamed && MATE_THEMES.includes(puzzle.theme);
  const notMate = mate ? "That's not checkmate. " : '';
  switch (reason) {
    case 'mate':
      return `${opponent} checkmates you: ${describeMove(position, reply!)}.`;
    case 'capture':
      return `${notMate}${opponent} takes your ${PIECE_NAMES[answer.captured!]} on ${answer.to}.`;
    case 'escape':
      if (mate) return `The king escapes to ${answer.to}.`;
      break;
  }
  if (mate) return `${notMate}${skillById[puzzle.theme].hint}`;
  return `${opponent} is safe now. ${themeNamed ? skillById[puzzle.theme].hint : GENERAL_CUE}`;
}
