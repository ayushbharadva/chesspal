import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { legalMoves, PIECE_NAMES, readPosition, type ChessColor, type Square } from '@/chess';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Piece } from '@/components/board/piece';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useElevation, useTheme } from '@/hooks/use-theme';

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
  const elevation = useElevation();
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
      <View
        style={[styles.board, { backgroundColor: theme.boardDark, boxShadow: elevation.raised }]}
        accessibilityLabel="Chessboard">
        {ranks.split('').map((rank, row) => (
          <View key={rank} style={styles.row}>
            {files.split('').map((file, column) => {
              const square = `${file}${rank}` as Square;
              const piece = position.pieces.find((candidate) => candidate.square === square);
              const light = (row + column) % 2 === 0;
              const isTarget = targets.some((move) => move.to === square);
              const highlighted =
                selected === square || lastMove?.from === square || lastMove?.to === square;
              const labelColor = light
                ? theme.boardLabelLight
                : highlighted
                  ? theme.boardLabelHighlight
                  : theme.boardLabelDark;
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
                  {hintSquare === square && selected !== square && (
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
                        piece
                          ? { borderColor: theme.boardTarget }
                          : { backgroundColor: theme.boardTarget },
                      ]}
                    />
                  )}
                  {column === 0 && (
                    <ThemedText style={[styles.rank, { color: labelColor }]}>{rank}</ThemedText>
                  )}
                  {row === 7 && (
                    <ThemedText style={[styles.file, { color: labelColor }]}>{file}</ThemedText>
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
            style={[
              styles.promotionCard,
              { backgroundColor: theme.surface, boxShadow: elevation.raised },
            ]}
            accessibilityViewIsModal>
            <ThemedText type="headline" accessibilityRole="header">
              Promote your pawn
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Choose the piece your pawn becomes.
            </ThemedText>
            <View style={styles.promotionOptions}>
              {promotions?.moves.map((move) => (
                <Pressable
                  key={move.uci}
                  accessibilityRole="button"
                  accessibilityLabel={`Promote to ${PIECE_NAMES[move.promotion!]}`}
                  style={({ pressed }) => [
                    styles.promotionOption,
                    { backgroundColor: theme.boardLight, borderColor: theme.border },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    setPromotions(null);
                    setSelection(null);
                    if (promotions.fen === fen && interactive) onMove?.(move.uci);
                  }}>
                  <View style={styles.promotionPiece}>
                    <Piece
                      piece={{ color: position.turn, type: move.promotion!, square: move.to }}
                    />
                  </View>
                  <ThemedText type="overline" themeColor="textSecondary">
                    {PIECE_NAMES[move.promotion!]}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
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
    overflow: 'hidden',
    borderRadius: Radius.medium,
  },
  row: { flex: 1, flexDirection: 'row' },
  square: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  outline: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderWidth: 3 },
  target: { width: '28%', aspectRatio: 1, borderRadius: 50 },
  captureTarget: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 2,
    right: 2,
    borderWidth: 4,
    borderRadius: 50,
  },
  rank: {
    position: 'absolute',
    top: 1,
    left: 3,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: Fonts.bold,
  },
  file: {
    position: 'absolute',
    bottom: 0,
    right: 3,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: Fonts.bold,
  },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: Spacing.four },
  promotionCard: {
    padding: Spacing.four,
    gap: Spacing.three,
    borderRadius: Radius.large,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  promotionOptions: { flexDirection: 'row', gap: Spacing.two },
  promotionOption: {
    flex: 1,
    aspectRatio: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.medium,
    borderWidth: 1,
    paddingBottom: Spacing.two,
  },
  promotionPiece: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
});
