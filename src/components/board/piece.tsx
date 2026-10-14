import Svg, { Circle, Path } from 'react-native-svg';

import { type BoardPiece } from '@/chess';
import { useTheme } from '@/hooks/use-theme';

const paths = {
  r: 'M13 10h7v7h8v-7h8v7h8v-7h7v15l-7 5v20H20V30l-7-5z M15 51h34v7H15z',
  n: 'M16 50l3-17 9-8-8-2 2-10 11-5 11 10 4 16-5 16z M13 51h37v7H13z',
  b: 'M32 8c-12 12-12 19-4 24l-7 18h22l-7-18c8-5 8-12-4-24z M14 51h36v7H14z',
  q: 'M16 20l8 10 8-14 8 14 8-10-5 29H21z M15 51h34v7H15z',
  k: 'M29 8h6v6h7v6h-7v9h-6v-9h-7v-6h7z M21 30c-12-13-17 8 1 15l-2 5h24l-2-5c18-7 13-28 1-15-7-8-15-8-22 0z M15 51h34v7H15z',
  p: 'M27 27h10l5 22H22z M15 51h34v7H15z',
};

export function Piece({ piece }: { piece: BoardPiece }) {
  const theme = useTheme();
  const fill = piece.color === 'w' ? theme.pieceWhite : theme.pieceBlack;
  const stroke = piece.color === 'w' ? theme.pieceWhiteOutline : theme.pieceBlackOutline;
  return (
    <Svg width="86%" height="86%" viewBox="0 0 64 64" accessible={false}>
      <Path
        d={paths[piece.type]}
        fill={fill}
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {piece.type === 'p' && (
        <Circle cx={32} cy={19} r={9} fill={fill} stroke={stroke} strokeWidth={2} />
      )}
      {piece.type === 'q' &&
        [16, 32, 48].map((x) => (
          <Circle
            key={x}
            cx={x}
            cy={x === 32 ? 12 : 16}
            r={3.5}
            fill={fill}
            stroke={stroke}
            strokeWidth={1.5}
          />
        ))}
      {piece.type === 'n' && <Circle cx={33} cy={18} r={2} fill={stroke} />}
      {piece.type === 'b' && <Path d="M34 16l-7 9" stroke={stroke} strokeWidth={2.5} />}
    </Svg>
  );
}
