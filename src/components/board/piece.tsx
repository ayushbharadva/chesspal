import { SvgXml } from 'react-native-svg';

import { type BoardPiece } from '@/chess';
import { pieceSvgs } from '@/components/board/piece-svgs';
import { useProgressStore } from '@/progress/store';
import { type PieceSetId } from '@/progress/types';

type PieceKey = keyof (typeof pieceSvgs)['classic'];

/** A piece in the player's chosen set, or in `set` when one is given, as in the Settings preview. */
export function Piece({
  piece,
  set,
}: {
  piece: Pick<BoardPiece, 'color' | 'type'>;
  set?: PieceSetId;
}) {
  const chosen = useProgressStore((state) => state.settings.pieceSet);
  const key = `${piece.color}${piece.type.toUpperCase()}` as PieceKey;
  return <SvgXml xml={pieceSvgs[set ?? chosen][key]} width="88%" height="88%" />;
}
