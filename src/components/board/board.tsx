import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { legalMoves, PIECE_NAMES, readPosition, type ChessColor, type Square } from '@/chess';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Piece } from '@/components/board/piece';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface BoardProps {
  fen: string;
  orientation?: ChessColor;
  interactive?: boolean;
  onMove?: (move: string) => void;
  onIllegalMove?: () => void;
  lastMove?: { from: Square; to: Square };
  hintSquare?: Square;
}

export function Board({
  fen,
  orientation = 'w',
  interactive = false,
  onMove,
  onIllegalMove,
  lastMove,
  hintSquare,
}: BoardProps) {
  const theme = useTheme();
  const [selection, setSelection] = useState<{ fen: string; square: Square } | null>(null);
  const [promotions, setPromotions] = useState<{
    fen: string;
    moves: ReturnType<typeof legalMoves>;
  } | null>(null);
  const position = useMemo(() => readPosition(fen), [fen]);
  const selected = selection?.fen === fen ? selection.square : null;
  const targets = useMemo(() => (selected ? legalMoves(fen, selected) : []), [fen, selected]);
  const files = orientation === 'w' ? 'abcdefgh' : 'hgfedcba';
  const ranks = orientation === 'w' ? '87654321' : '12345678';

  function selectSquare(square: Square) {
    if (!interactive) return;
    const piece = position.pieces.find((candidate) => candidate.square === square);
    if (piece?.color === position.turn) {
      setSelection(selected === square ? null : { fen, square });
      return;
    }
    const moves = targets.filter((candidate) => candidate.to === square);
    if (!moves.length) {
      if (selected) onIllegalMove?.();
      return;
    }
    if (moves.some((move) => move.promotion)) {
      setPromotions({ fen, moves });
      return;
    }
    setSelection(null);
    onMove?.(moves[0].uci);
  }

  return (
    <View>
      <View style={[styles.board, { borderColor: theme.border }]} accessibilityLabel="Chessboard">
        {ranks.split('').map((rank, row) => (
          <View key={rank} style={styles.row}>
            {files.split('').map((file, column) => {
              const square = `${file}${rank}` as Square;
              const piece = position.pieces.find((candidate) => candidate.square === square);
              const light = (row + column) % 2 === 0;
              const isTarget = targets.some((move) => move.to === square);
              const highlighted = lastMove?.from === square || lastMove?.to === square;
              const label = `${square}, ${piece ? `${piece.color === 'w' ? 'white' : 'black'} ${PIECE_NAMES[piece.type]}` : 'empty'}${isTarget ? ', legal destination' : ''}`;
              return (
                <Pressable
                  key={square}
                  testID={`square-${square}`}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: selected === square, disabled: !interactive }}
                  accessibilityHint={
                    interactive
                      ? isTarget
                        ? 'Tap to move here'
                        : 'Tap your piece to see its legal moves'
                      : 'Board preview'
                  }
                  onPress={() => selectSquare(square)}
                  style={[
                    styles.square,
                    {
                      backgroundColor: highlighted
                        ? light
                          ? theme.boardLastLight
                          : theme.boardLastDark
                        : light
                          ? theme.boardLight
                          : theme.boardDark,
                    },
                  ]}>
                  {(selected === square || hintSquare === square) && (
                    <View
                      pointerEvents="none"
                      style={[styles.outline, { borderColor: theme.boardFocus }]}
                    />
                  )}
                  {piece && <Piece piece={piece} />}
                  {isTarget && (
                    <View
                      pointerEvents="none"
                      style={[
                        piece ? styles.captureTarget : styles.target,
                        {
                          borderColor: light ? theme.boardLabelLight : theme.boardLabelDark,
                          backgroundColor: piece
                            ? undefined
                            : light
                              ? theme.boardLabelLight
                              : theme.boardLabelDark,
                        },
                      ]}
                    />
                  )}
                  {column === 0 && (
                    <ThemedText
                      style={[
                        styles.rank,
                        { color: light ? theme.boardLabelLight : theme.boardLabelDark },
                      ]}>
                      {rank}
                    </ThemedText>
                  )}
                  {row === 7 && (
                    <ThemedText
                      style={[
                        styles.file,
                        { color: light ? theme.boardLabelLight : theme.boardLabelDark },
                      ]}>
                      {file}
                    </ThemedText>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <Modal
        visible={Boolean(promotions?.fen === fen && interactive)}
        transparent
        animationType="fade"
        onRequestClose={() => setPromotions(null)}>
        <View style={[styles.modalBackdrop, { backgroundColor: theme.modalBackdrop }]}>
          <View
            style={[styles.promotionCard, { backgroundColor: theme.surface }]}
            accessibilityViewIsModal>
            <ThemedText type="subtitle" accessibilityRole="header">
              Promote your pawn
            </ThemedText>
            {promotions?.moves.map((move) => (
              <Button
                key={move.uci}
                label={`Promote to ${PIECE_NAMES[move.promotion!]}`}
                onPress={() => {
                  setPromotions(null);
                  setSelection(null);
                  if (promotions.fen === fen && interactive) onMove?.(move.uci);
                }}
              />
            ))}
            <Button variant="secondary" label="Cancel" onPress={() => setPromotions(null)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    width: '100%',
    aspectRatio: 1,
    borderWidth: 1,
    overflow: 'hidden',
    borderRadius: Radius.small,
  },
  row: { flex: 1, flexDirection: 'row' },
  square: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  outline: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderWidth: 3 },
  target: { width: '23%', aspectRatio: 1, borderRadius: 50, opacity: 0.65 },
  captureTarget: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderWidth: 3,
    borderRadius: 50,
    opacity: 0.8,
  },
  rank: { position: 'absolute', top: 0, left: 2, fontSize: 9, lineHeight: 12, fontWeight: '700' },
  file: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
  },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: Spacing.four },
  promotionCard: { padding: Spacing.four, gap: Spacing.three, borderRadius: Radius.large },
});
