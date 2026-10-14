import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { describeMove, playMove, positionAfter, readPosition, type Square } from '@/chess';
import { Board } from '@/components/board/board';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { puzzleById } from '@/content';
import { Spacing } from '@/constants/theme';
import { useProgressStore } from '@/progress/store';

export default function WorkoutScreen() {
  const session = useProgressStore((state) => state.currentSession);
  const hydrated = useProgressStore((state) => state.hydrated);
  const answer = useProgressStore((state) => state.answer);
  const hint = useProgressStore((state) => state.hint);
  const reveal = useProgressStore((state) => state.reveal);
  const replayStep = useProgressStore((state) => state.replayStep);
  const next = useProgressStore((state) => state.continuePractice);
  const [ruleMessage, setRuleMessage] = useState('');
  if (!hydrated)
    return (
      <Screen>
        <ThemedText>Restoring your practice…</ThemedText>
      </Screen>
    );
  if (!session || session.phase === 'complete')
    return (
      <Screen>
        <ThemedText>No unfinished workout.</ThemedText>
        <Button
          label={session ? 'See results' : 'Go home'}
          onPress={() => router.replace(session ? '/result' : '/')}
        />
      </Screen>
    );
  const puzzle = puzzleById[session.puzzleIds[session.index]];
  const fen = session.acceptedFen ?? positionAfter(puzzle.fen, puzzle.moves, session.ply);
  const orientation = readPosition(puzzle.fen).turn;
  const expected = session.phase === 'solve' ? playMove(fen, puzzle.moves[session.ply]) : null;
  const previous =
    session.phase === 'feedback' && session.acceptedMove
      ? {
          from: session.acceptedMove.slice(0, 2) as Square,
          to: session.acceptedMove.slice(2, 4) as Square,
        }
      : session.ply > 0
        ? playMove(
            positionAfter(puzzle.fen, puzzle.moves, session.ply - 1),
            puzzle.moves[session.ply - 1],
          )
        : undefined;
  return (
    <Screen>
      <View style={styles.heading}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Puzzle {session.index + 1} of {session.puzzleIds.length}
          {session.mode === 'review' ? ' · Review' : ''}
        </ThemedText>
        <ThemedText type="subtitle" accessibilityRole="header">
          {puzzle.goal}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {orientation === 'w' ? 'White' : 'Black'} to play ·{' '}
          {session.phase === 'replay'
            ? 'Solution replay'
            : 'Tap a piece, then a highlighted square'}
        </ThemedText>
      </View>
      <Board
        fen={fen}
        orientation={orientation}
        interactive={session.phase === 'solve'}
        onMove={(move) => {
          setRuleMessage('');
          answer(move);
        }}
        onIllegalMove={() => setRuleMessage('Choose a highlighted square to make a legal move.')}
        lastMove={previous}
        hintSquare={session.hintsShown >= 2 ? expected?.from : undefined}
      />
      {ruleMessage ? (
        <ThemedText type="small" accessibilityLiveRegion="polite">
          {ruleMessage}
        </ThemedText>
      ) : null}
      {session.lastWrong && (
        <Card>
          <ThemedText type="smallBold" accessibilityLiveRegion="polite">
            Try again. That move does not finish this tactic.
          </ThemedText>
          <ThemedText type="small">
            Look at checks, captures and threats. A hint is available whenever you need one.
          </ThemedText>
        </Card>
      )}
      {session.phase === 'solve' && (
        <>
          {session.hintsShown > 0 && (
            <Card>
              <ThemedText type="smallBold">Hint {session.hintsShown}</ThemedText>
              <ThemedText>
                {session.hintsShown === 1
                  ? puzzle.hints[0]
                  : session.hintsShown === 2
                    ? `Look at the piece on ${expected?.from}.`
                    : describeMove(fen, puzzle.moves[session.ply])}
              </ThemedText>
            </Card>
          )}
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button
                variant="secondary"
                label={session.hintsShown ? 'Another hint' : 'Get a hint'}
                disabled={session.hintsShown >= 3}
                onPress={() => {
                  setRuleMessage('');
                  hint();
                }}
              />
            </View>
            <View style={styles.action}>
              <Button
                variant="secondary"
                label="Show solution"
                onPress={() => {
                  setRuleMessage('');
                  reveal();
                }}
              />
            </View>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Hints support learning. Assisted solves are tracked separately.
          </ThemedText>
        </>
      )}
      {session.phase === 'replay' && (
        <>
          <Card>
            <ThemedText type="smallBold">
              One solution · Move {session.ply} of {puzzle.moves.length}
            </ThemedText>
            <ThemedText>{describeMove(fen, puzzle.moves[session.ply])}</ThemedText>
          </Card>
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button
                variant="secondary"
                label="Previous move"
                disabled={session.ply === 0}
                onPress={() => replayStep(-1)}
              />
            </View>
            <View style={styles.action}>
              <Button label="Show next move" onPress={() => replayStep(1)} />
            </View>
          </View>
        </>
      )}
      {session.phase === 'feedback' && (
        <>
          <Card accent>
            <ThemedText type="subtitle" accessibilityLiveRegion="polite">
              {session.results.at(-1)?.independent ? 'Well spotted!' : 'A useful rep.'}
            </ThemedText>
            <ThemedText>{puzzle.explanation}</ThemedText>
          </Card>
          <Button
            label={session.index === session.puzzleIds.length - 1 ? 'See results' : 'Next puzzle'}
            onPress={() => {
              setRuleMessage('');
              if (next()) router.replace('/result');
            }}
          />
        </>
      )}
      <ThemedText type="small" themeColor="textSecondary">
        Your place is saved automatically. Leave and resume anytime.
      </ThemedText>
    </Screen>
  );
}
const styles = StyleSheet.create({
  heading: { gap: Spacing.one },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
});
