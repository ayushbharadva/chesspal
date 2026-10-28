import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { describeMove, playMove, positionAfter, readPosition, type Square } from '@/chess';
import { Board } from '@/components/board/board';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { type IconName } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { IconBadge, ProgressBar } from '@/components/ui';
import { puzzleById } from '@/content';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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
  const lastResult = session.results.at(-1);
  return (
    <Screen>
      <View style={styles.heading}>
        <View style={styles.progressRow}>
          <ThemedText type="overline" themeColor="textSecondary">
            Puzzle {session.index + 1} of {session.puzzleIds.length}
            {session.mode === 'review' ? ' · Review' : ''}
          </ThemedText>
          <TurnBadge color={orientation} />
        </View>
        <ProgressBar
          value={
            (session.index + (session.phase === 'feedback' ? 1 : 0)) / session.puzzleIds.length
          }
        />
        <ThemedText type="headline" accessibilityRole="header">
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
        <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
          {ruleMessage}
        </ThemedText>
      ) : null}
      {session.lastWrong && (
        <Card variant="danger">
          <Feedback
            icon="x"
            tone="danger"
            title="Try again. That move does not finish this tactic.">
            Look at checks, captures and threats. A hint is available whenever you need one.
          </Feedback>
        </Card>
      )}
      {session.phase === 'solve' && (
        <>
          {session.hintsShown > 0 && (
            <Card variant="accent">
              <Feedback icon="lightbulb" tone="accent" title={`Hint ${session.hintsShown}`}>
                {session.hintsShown === 1
                  ? puzzle.hints[0]
                  : session.hintsShown === 2
                    ? `Look at the piece on ${expected?.from}.`
                    : describeMove(fen, puzzle.moves[session.ply])}
              </Feedback>
            </Card>
          )}
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button
                size="compact"
                variant="secondary"
                icon="lightbulb"
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
                size="compact"
                variant="secondary"
                icon="eye"
                label="Show solution"
                onPress={() => {
                  setRuleMessage('');
                  reveal();
                }}
              />
            </View>
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
            Hints support learning. Assisted solves are tracked separately.
          </ThemedText>
        </>
      )}
      {session.phase === 'replay' && (
        <>
          <Card variant="accent">
            <Feedback
              icon="play"
              tone="accent"
              title={`One solution · Move ${session.ply} of ${puzzle.moves.length}`}>
              {describeMove(fen, puzzle.moves[session.ply])}
            </Feedback>
          </Card>
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button
                size="compact"
                variant="secondary"
                label="Previous move"
                disabled={session.ply === 0}
                onPress={() => replayStep(-1)}
              />
            </View>
            <View style={styles.action}>
              <Button size="compact" label="Show next move" onPress={() => replayStep(1)} />
            </View>
          </View>
        </>
      )}
      {session.phase === 'feedback' && (
        <>
          <Card variant={lastResult?.independent ? 'success' : 'accent'}>
            <Feedback
              icon={lastResult?.independent ? 'check' : 'sparkles'}
              tone={lastResult?.independent ? 'success' : 'accent'}
              title={lastResult?.independent ? 'Well spotted!' : 'A useful rep.'}
              live>
              {puzzle.explanation}
            </Feedback>
          </Card>
          <Button
            icon="arrow-right"
            label={session.index === session.puzzleIds.length - 1 ? 'See results' : 'Next puzzle'}
            onPress={() => {
              setRuleMessage('');
              if (next()) router.replace('/result');
            }}
          />
        </>
      )}
      <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
        Your place is saved automatically. Leave and resume anytime.
      </ThemedText>
    </Screen>
  );
}

function TurnBadge({ color }: { color: 'w' | 'b' }) {
  const theme = useTheme();
  return (
    <View style={styles.turn}>
      <View
        style={[
          styles.turnDot,
          {
            backgroundColor: color === 'w' ? theme.pieceWhite : theme.pieceBlack,
            borderColor: theme.textSecondary,
          },
        ]}
      />
      <ThemedText type="overline" themeColor="textSecondary">
        {color === 'w' ? 'White' : 'Black'}
      </ThemedText>
    </View>
  );
}

/** Icon, title and body for hint, mistake and success messages. */
function Feedback({
  icon,
  tone,
  title,
  children,
  live = false,
}: {
  icon: IconName;
  tone: 'accent' | 'success' | 'danger';
  title: string;
  children: string;
  live?: boolean;
}) {
  return (
    <View style={styles.feedback}>
      <IconBadge name={icon} tone={tone} size={36} solid />
      <View style={styles.feedbackText}>
        <ThemedText
          type={live ? 'headline' : 'smallBold'}
          themeColor={live ? 'text' : tone}
          accessibilityLiveRegion="polite">
          {title}
        </ThemedText>
        <ThemedText>{children}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { gap: Spacing.two },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  turn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + Spacing.half },
  turnDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1 },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
  feedback: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  feedbackText: { flex: 1, gap: Spacing.one },
  note: { textAlign: 'center' },
});
