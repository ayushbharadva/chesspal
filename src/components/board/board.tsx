import { Fragment, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type PanResponderInstance,
} from 'react-native';
import Svg, { Line, Polygon } from 'react-native-svg';

import {
  classifyMove,
  legalMoves,
  PIECE_NAMES,
  readPosition,
  type ChessColor,
  type Square,
} from '@/chess';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { ScrollLockContext } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Piece } from '@/components/board/piece';
import { SuccessBurst } from '@/components/board/success-burst';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useHaptics } from '@/hooks/use-haptics';
import { useMotionEnabled } from '@/hooks/use-motion';
import { useElevation, useTheme } from '@/hooks/use-theme';
import { playSound } from '@/sounds/play-sound';

const SLIDE_MS = 170;
const DRAG_START_DISTANCE = 6;
/** Web has no native animation driver. */
const USE_NATIVE_DRIVER = Platform.OS !== 'web';
/**
 * On a phone the board takes a touch on your own piece as soon as it lands, because a scrolling
 * page would otherwise win a straight-down drag. Web keeps the browser's own click handling.
 */
const CLAIM_ON_TOUCH = Platform.OS !== 'web';

interface BoardProps {
  fen: string;
  orientation?: ChessColor;
  interactive?: boolean;
  onMove?: (move: string) => void;
  onIllegalMove?: () => void;
  lastMove?: { from: Square; to: Square };
  hintSquare?: Square;
  /** Square to mark as a correct answer. */
  successSquare?: Square;
  /** Squares a drill piece should reach. */
  stars?: readonly string[];
  /** Squares tinted to draw the eye, such as a square being named. */
  marks?: readonly string[];
  arrows?: readonly (readonly [string, string])[];
  /** Squares already tapped correctly, and the last wrong tap. */
  found?: readonly string[];
  wrongSquare?: string;
  /** Makes every square tappable instead of moving pieces, for "tap the square" questions. */
  onSquarePress?: (square: Square) => void;
}

/** The square under a piece dragged from `origin`, or null when dropped off the board. */
export function dropSquare(
  origin: { x: number; y: number },
  offsetX: number,
  offsetY: number,
  squareSize: number,
  files: string,
  ranks: string,
) {
  const file = files[Math.floor((origin.x + squareSize / 2 + offsetX) / squareSize)];
  const rank = ranks[Math.floor((origin.y + squareSize / 2 + offsetY) / squareSize)];
  return file && rank ? (`${file}${rank}` as Square) : null;
}

export function Board({
  fen,
  orientation = 'w',
  interactive = false,
  onMove,
  onIllegalMove,
  lastMove,
  hintSquare,
  successSquare,
  stars = [],
  marks = [],
  arrows = [],
  found = [],
  wrongSquare,
  onSquarePress,
}: BoardProps) {
  const theme = useTheme();
  const elevation = useElevation();
  const motion = useMotionEnabled();
  const haptic = useHaptics();
  const setScrollLocked = useContext(ScrollLockContext);
  const [selection, setSelection] = useState<{ fen: string; square: Square } | null>(null);
  const [promotions, setPromotions] = useState<{
    fen: string;
    moves: ReturnType<typeof legalMoves>;
  } | null>(null);
  const [boardSize, setBoardSize] = useState(0);
  const [dragging, setDragging] = useState<Square | null>(null);
  const [dropped, setDropped] = useState<string | null>(null);
  const [dragOffset] = useState(() => new Animated.ValueXY());
  const position = useMemo(() => readPosition(fen), [fen]);
  const selected = selection?.fen === fen ? selection.square : null;
  const targets = useMemo(() => (selected ? legalMoves(fen, selected) : []), [fen, selected]);
  const files = orientation === 'w' ? 'abcdefgh' : 'hgfedcba';
  const ranks = orientation === 'w' ? '87654321' : '12345678';
  const squareSize = boardSize / 8;
  const checkedKing = position.inCheck
    ? position.pieces.find((piece) => piece.type === 'k' && piece.color === position.turn)?.square
    : undefined;

  function squareOrigin(square: Square) {
    return {
      x: files.indexOf(square[0]) * squareSize,
      y: ranks.indexOf(square[1]) * squareSize,
    };
  }

  // Slide a newly played move from its origin. A dropped piece is already where it belongs.
  const moveKey = lastMove ? `${fen}|${lastMove.from}${lastMove.to}` : null;
  const [settledMove, setSettledMove] = useState(moveKey);
  const movedPiece = lastMove
    ? position.pieces.find((piece) => piece.square === lastMove.to)
    : undefined;
  const sliding =
    motion &&
    boardSize > 0 &&
    moveKey !== settledMove &&
    Boolean(movedPiece) &&
    dropped !== `${lastMove?.from}${lastMove?.to}`;
  if (!sliding && moveKey !== settledMove) setSettledMove(moveKey);
  // A fresh value per move, so each slide starts from its origin.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const slide = useMemo(() => new Animated.Value(0), [moveKey]);
  useEffect(() => {
    if (!sliding) return;
    const animation = Animated.timing(slide, {
      toValue: 1,
      duration: SLIDE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    });
    animation.start(() => setSettledMove(moveKey));
    return () => animation.stop();
  }, [sliding, slide, moveKey]);

  // Every move that appears on the board gets its sound: the player's, replies and demonstrations.
  const heardFen = useRef(fen);
  const heardMove = useRef(moveKey);
  useEffect(() => {
    const before = heardFen.current;
    const isNew = heardMove.current !== moveKey;
    heardFen.current = fen;
    heardMove.current = moveKey;
    if (isNew && lastMove && before !== fen) playSound(classifyMove(before, fen));
    // moveKey already changes whenever lastMove does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, moveKey]);

  /** Plays a move if legal, asking first for a promotion. Returns false when it is not legal. */
  function play(from: Square, to: Square, wasDropped: boolean) {
    const moves = legalMoves(fen, from).filter((candidate) => candidate.to === to);
    if (!moves.length) return false;
    setDropped(wasDropped ? `${from}${to}` : null);
    if (moves.some((move) => move.promotion)) {
      setSelection({ fen, square: from });
      setPromotions({ fen, moves });
      return true;
    }
    setSelection(null);
    onMove?.(moves[0].uci);
    return true;
  }

  function toggleOwnPiece(square: Square) {
    haptic('tick');
    setDropped(null);
    setSelection((current) =>
      current?.fen === fen && current.square === square ? null : { fen, square },
    );
  }

  function selectSquare(square: Square) {
    if (onSquarePress) {
      haptic('tick');
      onSquarePress(square);
      return;
    }
    if (!interactive) return;
    const piece = position.pieces.find((candidate) => candidate.square === square);
    if (piece?.color === position.turn) {
      toggleOwnPiece(square);
      return;
    }
    if (!selected) return;
    if (!play(selected, square, false)) onIllegalMove?.();
  }

  function finishDrag(from: Square, offsetX: number, offsetY: number) {
    setDragging(null);
    const to = dropSquare(squareOrigin(from), offsetX, offsetY, squareSize, files, ranks);
    // A drop off the board or on an illegal square just returns the piece, without a penalty.
    if (to && to !== from) play(from, to, true);
  }

  const dragHandlers = useMemo(() => {
    const handlers: Partial<Record<Square, PanResponderInstance>> = {};
    if (!interactive || boardSize === 0) return handlers;
    const moved = (distanceX: number, distanceY: number) =>
      Math.hypot(distanceX, distanceY) > DRAG_START_DISTANCE;
    for (const piece of position.pieces) {
      if (piece.color !== position.turn) continue;
      // PanResponder restarts its distances when granted, so remember how far a flick already got.
      const gesture = { headX: 0, headY: 0, dragging: false };
      const claim = (distanceX: number, distanceY: number) => {
        gesture.headX = distanceX;
        gesture.headY = distanceY;
        return moved(distanceX, distanceY);
      };
      const beginDrag = () => {
        gesture.dragging = true;
        setDragging(piece.square);
        setDropped(null);
        setSelection({ fen, square: piece.square });
        haptic('tick');
      };
      handlers[piece.square] = PanResponder.create({
        onStartShouldSetPanResponderCapture: () => CLAIM_ON_TOUCH,
        onStartShouldSetPanResponder: () => CLAIM_ON_TOUCH,
        onMoveShouldSetPanResponderCapture: (_, state) => claim(state.dx, state.dy),
        onMoveShouldSetPanResponder: (_, state) => claim(state.dx, state.dy),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          setScrollLocked(true);
          gesture.dragging = false;
          dragOffset.setValue({ x: gesture.headX, y: gesture.headY });
          if (moved(gesture.headX, gesture.headY)) beginDrag();
        },
        onPanResponderMove: (_, state) => {
          const x = gesture.headX + state.dx;
          const y = gesture.headY + state.dy;
          if (!gesture.dragging && moved(x, y)) beginDrag();
          dragOffset.setValue({ x, y });
        },
        onPanResponderRelease: (_, state) => {
          setScrollLocked(false);
          if (gesture.dragging)
            finishDrag(piece.square, gesture.headX + state.dx, gesture.headY + state.dy);
          else toggleOwnPiece(piece.square);
          gesture.headX = 0;
          gesture.headY = 0;
        },
        onPanResponderTerminate: () => {
          setScrollLocked(false);
          setDragging(null);
          gesture.headX = 0;
          gesture.headY = 0;
        },
      });
    }
    return handlers;
    // Handlers read the current position, so they are rebuilt when it or the board size changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, interactive, boardSize, orientation, position]);

  const draggedPiece = dragging
    ? position.pieces.find((piece) => piece.square === dragging)
    : undefined;

  return (
    <View>
      <Animated.View
        onLayout={(event) => setBoardSize(event.nativeEvent.layout.width)}
        style={[
          styles.board,
          {
            backgroundColor: theme.boardDark,
            boxShadow: elevation.raised,
          },
        ]}
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
              const star = stars.includes(square);
              const label = `${square}, ${piece ? `${piece.color === 'w' ? 'white' : 'black'} ${PIECE_NAMES[piece.type]}` : 'empty'}${star ? ', star' : ''}${isTarget ? ', legal destination' : ''}`;
              const tint = found.includes(square)
                ? theme.boardSuccess
                : wrongSquare === square
                  ? theme.boardWrong
                  : marks.includes(square)
                    ? theme.boardMark
                    : undefined;
              const hidden = dragging === square || (sliding && lastMove?.to === square);
              return (
                <View key={square} style={styles.square} {...dragHandlers[square]?.panHandlers}>
                  <Pressable
                    testID={`square-${square}`}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    accessibilityState={{
                      selected: selected === square || found.includes(square),
                      disabled: !interactive && !onSquarePress,
                    }}
                    accessibilityHint={
                      onSquarePress
                        ? 'Tap to choose this square'
                        : interactive
                          ? isTarget
                            ? 'Tap to move here'
                            : 'Tap your piece to see its legal moves'
                          : 'Board preview'
                    }
                    onPress={() => selectSquare(square)}
                    style={[
                      styles.squareFill,
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
                    {tint && (
                      <View pointerEvents="none" style={[styles.tint, { backgroundColor: tint }]} />
                    )}
                    {star && !piece && (
                      <View pointerEvents="none" style={styles.star}>
                        <Icon
                          name="star"
                          size={Math.max(12, squareSize * 0.55)}
                          color="boardStar"
                          fill="boardStar"
                          strokeWidth={1.5}
                        />
                      </View>
                    )}
                    {successSquare === square && (
                      <View
                        pointerEvents="none"
                        style={[styles.tint, { backgroundColor: theme.boardSuccess }]}
                      />
                    )}
                    {successSquare === square && <SuccessBurst />}
                    {checkedKing === square && (
                      <View
                        pointerEvents="none"
                        style={[styles.check, { backgroundColor: theme.boardCheck }]}
                      />
                    )}
                    {hintSquare === square && selected !== square && (
                      <View
                        pointerEvents="none"
                        style={[styles.outline, { borderColor: theme.boardFocus }]}
                      />
                    )}
                    {piece && !hidden && <Piece piece={piece} />}
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
                </View>
              );
            })}
          </View>
        ))}
      </Animated.View>
      {arrows.length > 0 && boardSize > 0 && (
        <View
          pointerEvents="none"
          style={styles.floating}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          <Svg width={boardSize} height={boardSize}>
            {arrows.map(([from, to]) => {
              const start = squareOrigin(from as Square);
              const end = squareOrigin(to as Square);
              const [x1, y1, centerX, centerY] = [start.x, start.y, end.x, end.y].map(
                (value) => value + squareSize / 2,
              );
              const angle = Math.atan2(centerY - y1, centerX - x1);
              // The tip stops short of the centre so a piece on the target square stays visible.
              const x2 = centerX - Math.cos(angle) * squareSize * 0.3;
              const y2 = centerY - Math.sin(angle) * squareSize * 0.3;
              const head = squareSize * 0.38;
              // Stop the shaft short so it does not poke through the arrowhead.
              const tipX = x2 - Math.cos(angle) * head * 0.6;
              const tipY = y2 - Math.sin(angle) * head * 0.6;
              const corner = (turn: number) =>
                `${x2 - Math.cos(angle + turn) * head},${y2 - Math.sin(angle + turn) * head}`;
              return (
                <Fragment key={`${from}${to}`}>
                  <Line
                    x1={x1}
                    y1={y1}
                    x2={tipX}
                    y2={tipY}
                    stroke={theme.boardArrow}
                    strokeWidth={squareSize * 0.16}
                    strokeLinecap="round"
                  />
                  <Polygon
                    points={`${x2},${y2} ${corner(0.5)} ${corner(-0.5)}`}
                    fill={theme.boardArrow}
                  />
                </Fragment>
              );
            })}
          </Svg>
        </View>
      )}
      {sliding && lastMove && movedPiece && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.floating,
            {
              width: squareSize,
              height: squareSize,
              transform: [
                {
                  translateX: slide.interpolate({
                    inputRange: [0, 1],
                    outputRange: [squareOrigin(lastMove.from).x, squareOrigin(lastMove.to).x],
                  }),
                },
                {
                  translateY: slide.interpolate({
                    inputRange: [0, 1],
                    outputRange: [squareOrigin(lastMove.from).y, squareOrigin(lastMove.to).y],
                  }),
                },
              ],
            },
          ]}>
          <Piece piece={movedPiece} />
        </Animated.View>
      )}
      {draggedPiece && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.floating,
            {
              // Lifted and enlarged so the finger does not hide the piece.
              left: squareOrigin(draggedPiece.square).x,
              top: squareOrigin(draggedPiece.square).y - squareSize * 0.35,
              width: squareSize,
              height: squareSize,
              transform: [
                { translateX: dragOffset.x },
                { translateY: dragOffset.y },
                { scale: 1.35 },
              ],
            },
          ]}>
          <Piece piece={draggedPiece} />
        </Animated.View>
      )}
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
                    <Piece piece={{ color: position.turn, type: move.promotion! }} />
                  </View>
                  <ThemedText type="label" themeColor="textSecondary">
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
  square: { flex: 1 },
  squareFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  floating: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tint: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  star: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { position: 'absolute', top: 2, bottom: 2, left: 2, right: 2, borderRadius: 50 },
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
