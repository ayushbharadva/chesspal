import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { type ChessColor, type Square } from '@/chess';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Pill, ProgressBar, Segmented } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useHaptics } from '@/hooks/use-haptics';
import { useElevation, useTheme } from '@/hooks/use-theme';
import { useProgressStore } from '@/progress/store';
import { bestScore, nextTarget, ROUND_SECONDS, secondsLeft } from '@/vision/coordinates';

type Round = { startedAt: number; target: Square; score: number; misses: number };

export default function VisionScreen() {
  const scores = useProgressStore((state) => state.visionScores);
  const recordVision = useProgressStore((state) => state.recordVision);
  const haptic = useHaptics();
  const [side, setSide] = useState<ChessColor>('w');
  const [round, setRound] = useState<Round | null>(null);
  const [now, setNow] = useState(0);
  const [finished, setFinished] = useState<number | null>(null);
  const [wrong, setWrong] = useState<Square | null>(null);
  const roundRef = useRef<Round | null>(null);
  const startedAt = round?.startedAt;
  useEffect(() => {
    roundRef.current = round;
  }, [round]);

  // One timer per round; it ends the round and saves the score when time runs out.
  useEffect(() => {
    if (startedAt === undefined) return;
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (secondsLeft(startedAt, time) > 0) return;
      clearInterval(timer);
      const score = roundRef.current?.score ?? 0;
      recordVision(side, score);
      setFinished(score);
      setRound(null);
    }, 200);
    return () => clearInterval(timer);
  }, [startedAt, side, recordVision]);

  function start() {
    setFinished(null);
    setWrong(null);
    const time = Date.now();
    setNow(time);
    setRound({ startedAt: time, target: nextTarget(null), score: 0, misses: 0 });
  }
  function tap(square: Square) {
    if (!round) return;
    if (square === round.target) {
      haptic('tick');
      setWrong(null);
      setRound({ ...round, target: nextTarget(round.target), score: round.score + 1 });
    } else {
      haptic('error');
      setWrong(square);
      setRound({ ...round, misses: round.misses + 1 });
    }
  }

  const best = bestScore(scores, side);
  const recent = scores[side].slice(-5);
  const left = round ? secondsLeft(round.startedAt, now) : ROUND_SECONDS;
  return (
    <Screen>
      <View style={styles.intro}>
        <ThemedText type="title" accessibilityRole="header">
          Board vision.
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Knowing every square by name helps you read moves, follow lessons and spot ideas faster.
          Tap as many named squares as you can in {ROUND_SECONDS} seconds.
        </ThemedText>
      </View>
      {round ? (
        <View style={styles.status}>
          <View style={styles.prompt}>
            <ThemedText type="overline" themeColor="textSecondary">
              Find
            </ThemedText>
            <ThemedText type="display" accessibilityLiveRegion="polite">
              {round.target}
            </ThemedText>
          </View>
          <View style={styles.counters}>
            <Pill icon="check" tone="success" label={`${round.score} found`} />
            <ThemedText type="headline" accessibilityLabel={`${left} seconds left`}>
              {left}s
            </ThemedText>
          </View>
        </View>
      ) : (
        <Segmented
          value={side}
          options={[
            { value: 'w', label: 'White side' },
            { value: 'b', label: 'Black side' },
          ]}
          onChange={setSide}
        />
      )}
      {round && <ProgressBar value={left / ROUND_SECONDS} />}
      <CoordinateBoard orientation={side} active={Boolean(round)} wrong={wrong} onTap={tap} />
      {!round && (
        <>
          {finished !== null && (
            <Card variant={best !== null && finished >= best ? 'success' : 'accent'}>
              <ThemedText type="headline" accessibilityLiveRegion="polite">
                {finished} {finished === 1 ? 'square' : 'squares'} found.
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {best !== null && finished >= best && finished > 0
                  ? 'That is your best from this side.'
                  : 'Keep going. A few rounds a day makes the board feel familiar.'}
              </ThemedText>
            </Card>
          )}
          <Button
            icon="play"
            label={finished === null ? 'Start round' : 'Play again'}
            onPress={start}
          />
          <Card>
            <ThemedText type="overline" themeColor="textSecondary">
              {side === 'w' ? 'White side' : 'Black side'}
            </ThemedText>
            <ThemedText type="headline">
              {best === null ? 'No rounds yet' : `Best: ${best} squares`}
            </ThemedText>
            {recent.length > 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                Recent: {recent.join(', ')}
              </ThemedText>
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}

/** A plain board for naming squares: no pieces or coordinates, so the player has to know them. */
function CoordinateBoard({
  orientation,
  active,
  wrong,
  onTap,
}: {
  orientation: ChessColor;
  active: boolean;
  wrong: Square | null;
  onTap: (square: Square) => void;
}) {
  const theme = useTheme();
  const elevation = useElevation();
  const files = orientation === 'w' ? 'abcdefgh' : 'hgfedcba';
  const ranks = orientation === 'w' ? '87654321' : '12345678';
  return (
    <View
      style={[styles.board, { boxShadow: elevation.raised }]}
      accessibilityLabel="Coordinate board">
      {ranks.split('').map((rank, row) => (
        <View key={rank} style={styles.row}>
          {files.split('').map((file, column) => {
            const square = `${file}${rank}` as Square;
            const light = (row + column) % 2 === 0;
            return (
              <Pressable
                key={square}
                testID={`vision-${square}`}
                accessibilityRole="button"
                accessibilityLabel={square}
                accessibilityState={{ disabled: !active }}
                disabled={!active}
                onPress={() => onTap(square)}
                style={[
                  styles.square,
                  {
                    backgroundColor:
                      wrong === square ? theme.danger : light ? theme.boardLight : theme.boardDark,
                  },
                ]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { gap: Spacing.two, paddingTop: Spacing.two },
  status: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  prompt: { gap: Spacing.half },
  counters: { alignItems: 'flex-end', gap: Spacing.two },
  board: { width: '100%', aspectRatio: 1, borderRadius: Radius.medium, overflow: 'hidden' },
  row: { flex: 1, flexDirection: 'row' },
  square: { flex: 1 },
});
