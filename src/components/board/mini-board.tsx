import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { readPosition, type ChessColor } from '@/chess';
import { Piece } from '@/components/board/piece';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Decorative, non-interactive board preview. Screen readers skip it; nearby text names the position. */
export function MiniBoard({
  fen,
  orientation = 'w',
  size = 96,
}: {
  fen: string;
  orientation?: ChessColor;
  size?: number;
}) {
  const theme = useTheme();
  const position = useMemo(() => readPosition(fen), [fen]);
  const files = orientation === 'w' ? 'abcdefgh' : 'hgfedcba';
  const ranks = orientation === 'w' ? '87654321' : '12345678';
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.board, { width: size, height: size }]}>
      {ranks.split('').map((rank, row) => (
        <View key={rank} style={styles.row}>
          {files.split('').map((file, column) => {
            const piece = position.pieces.find(
              (candidate) => candidate.square === `${file}${rank}`,
            );
            return (
              <View
                key={file}
                style={[
                  styles.square,
                  { backgroundColor: (row + column) % 2 ? theme.boardDark : theme.boardLight },
                ]}>
                {piece && <Piece piece={piece} />}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { borderRadius: Radius.small, overflow: 'hidden' },
  row: { flex: 1, flexDirection: 'row' },
  square: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
