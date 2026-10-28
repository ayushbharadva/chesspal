import { SvgXml } from 'react-native-svg';

import { type BoardPiece } from '@/chess';
import { pieceSvgs } from '@/components/board/piece-set';

export function Piece({ piece }: { piece: BoardPiece }) {
  const key = `${piece.color}${piece.type.toUpperCase()}` as keyof typeof pieceSvgs;
  return <SvgXml xml={pieceSvgs[key]} width="88%" height="88%" />;
}
