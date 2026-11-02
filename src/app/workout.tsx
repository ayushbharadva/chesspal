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
import { RoutePath } from '@/components/route-path';
import { IconBadge, ListRow, ProgressBar } from '@/components/ui';
import { puzzleById } from '@/content';
import { levelName } from '@/content/levels';
import { skillById } from '@/content/skills';
import { Spacing } from '@/constants/theme';
import { routeSteps, SAFE_HELPED_POINTS, SAFE_POINTS, STEEP_POINTS } from '@/daily-route/route';
import { useHaptics } from '@/hooks/use-haptics';
import { useReplyPause } from '@/hooks/use-reply-pause';
import { useTheme } from '@/hooks/use-theme';
import { CHIME_DELAY_MS, playSound } from '@/sounds/play-sound';
import { type Session } from '@/progress/types';
import { RUNG_NAMES } from '@/skills/ladder';
import { useProgressStore } from '@/progress/store';

export default function WorkoutScreen() {
  const session = useProgressStore((state) => state.currentSession);
  const hydrated = useProgressStore((state) => state.hydrated);
  const answer = useProgressStore((state) => state.answer);
  const hint = useProgressStore((state) => state.hint);
  const reveal = useProgressStore((state) => state.reveal);
  const replayStep = useProgressStore((state) => state.replayStep);
  const next = useProgressStore((state) => state.continuePractice);
  const chooseRoute = useProgressStore((state) => state.chooseRoute);
  // The move tip is only for the first few puzzles a player ever sees.
  const newPlayer = useProgressStore((state) => state.attempts.length < 3);
  const haptic = useHaptics();
  const [ruleMessage, setRuleMessage] = useState('');
  const replying = useReplyPause(
    `${session?.id}:${session?.index}`,
    session?.ply ?? 0,
    session?.phase === 'solve',
  );
  if (!hydrated)
    return (
      <Screen>
        <ThemedText>Loading your puzzles…</ThemedText>
      </Screen>
    );
  if (!session || session.phase === 'complete')
    return (
      <Screen>
        <ThemedText>No puzzles in progress.</ThemedText>
        <Button
          label={session ? 'See results' : 'Go home'}
          onPress={() => router.replace(session ? '/result' : '/')}
        />
      </Screen>
    );
  if (session.route?.choosing)
    return (
      <Screen>
        <RouteProgress session={session} />
        <View style={styles.heading}>
          <ThemedText type="title" accessibilityRole="header">
            Pick your next puzzle.
          </ThemedText>
          <ThemedText themeColor="textSecondary">Hard puzzles score double.</ThemedText>
        </View>
        <ListRow
          icon="shield"
          title="Normal"
          detail={`${SAFE_POINTS} points, or ${SAFE_HELPED_POINTS} with help`}
          accessibilityLabel="Choose a normal puzzle"
          onPress={() => {
            haptic('tick');
            chooseRoute(false);
          }}
        />
        <ListRow
          icon="mountain"
          title="Hard"
          detail={`${STEEP_POINTS} points, or 0 with help`}
          accessibilityLabel="Choose a hard puzzle"
          onPress={() => {
            haptic('tick');
            chooseRoute(true);
          }}
        />
      </Screen>
    );
  const puzzle = puzzleById[session.puzzleIds[session.index]];
  const settledFen = session.acceptedFen ?? positionAfter(puzzle.fen, puzzle.moves, session.ply);
  // Rest on the player's move for a moment before showing the opponent's reply.
  const fen = replying ? positionAfter(puzzle.fen, puzzle.moves, session.ply - 1) : settledFen;
  const orientation = readPosition(puzzle.fen).turn;
  const expected =
    session.phase === 'solve' ? playMove(settledFen, puzzle.moves[session.ply]) : null;
  const previous = replying
    ? playMove(
        positionAfter(puzzle.fen, puzzle.moves, session.ply - 2),
        puzzle.moves[session.ply - 2],
      )
    : session.phase === 'feedback' && session.acceptedMove
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
  const route = session.route;
  function play(move: string) {
    setRuleMessage('');
    answer(move);
    const after = useProgressStore.getState().currentSession;
    if (after?.phase === 'feedback') {
      haptic('success');
      // A mate already has its own fanfare, and help earns the move sound alone.
      const earned = after.results.at(-1)?.independent;
      if (earned && !readPosition(after.acceptedFen!).checkmate)
        setTimeout(() => playSound('correct'), CHIME_DELAY_MS);
    } else if (after?.lastWrong) {
      haptic('error');
      playSound('wrong');
    } else haptic('tick');
  }
  const footer =
    session.phase === 'solve' ? (
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button
            size="compact"
            variant="secondary"
            icon="lightbulb"
            label={session.hintsShown ? 'Another hint' : 'Hint'}
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
            label="Show answer"
            onPress={() => {
              setRuleMessage('');
              reveal();
            }}
          />
        </View>
      </View>
    ) : session.phase === 'replay' ? (
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
          <Button size="compact" label="Next move" onPress={() => replayStep(1)} />
        </View>
      </View>
    ) : (
      <Button
        icon="arrow-right"
        label={session.index === session.puzzleIds.length - 1 ? 'See results' : 'Next puzzle'}
        onPress={() => {
          setRuleMessage('');
          if (next()) router.replace('/result');
        }}
      />
    );
  return (
    <Screen footer={footer}>
      <View style={styles.heading}>
        <View style={styles.progressRow}>
          <ThemedText type="overline" themeColor="textSecondary" style={styles.progressLabel}>
            {`Puzzle ${session.index + 1} of ${session.puzzleIds.length}`}
            {route?.taken.includes(session.index) ? ' · Hard' : ''}
            {session.mode === 'review' ? ' · Review' : ''}
            {/* Practice rounds mix levels, so each puzzle names its own. */}
            {route || session.skill ? '' : ` · ${levelName(puzzle.level)}`}
            {session.skill
              ? ` · ${skillById[session.skill.theme].name} · ${RUNG_NAMES[session.skill.rung]}`
              : ''}
          </ThemedText>
          <TurnBadge color={orientation} />
        </View>
        {route ? (
          <RouteProgress session={session} />
        ) : (
          <ProgressBar
            value={
              (session.index + (session.phase === 'feedback' ? 1 : 0)) / session.puzzleIds.length
            }
          />
        )}
        <ThemedText type="headline" accessibilityRole="header">
          {/* Only the warm-up names the theme; later rounds test recognition. */}
          {session.skill && session.skill.rung > 1 ? 'Find the best move' : puzzle.goal}
        </ThemedText>
        {newPlayer && session.phase === 'solve' && (
          <ThemedText type="small" themeColor="textSecondary">
            Tap or drag a piece to move.
          </ThemedText>
        )}
      </View>
      <Board
        fen={fen}
        orientation={orientation}
        interactive={session.phase === 'solve' && !replying}
        onMove={play}
        onIllegalMove={() => {
          haptic('error');
          setRuleMessage("That piece can't move there.");
        }}
        lastMove={previous}
        hintSquare={session.hintsShown >= 2 ? expected?.from : undefined}
        successSquare={
          session.phase === 'feedback' && lastResult?.independent ? previous?.to : undefined
        }
        shakeKey={session.mistakes}
      />
      {ruleMessage ? (
        <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
          {ruleMessage}
        </ThemedText>
      ) : null}
      {session.lastWrong && (
        <Card variant="danger">
          <Feedback icon="x" tone="danger" title="Not quite. Try again.">
            Look for checks, captures and threats.
          </Feedback>
        </Card>
      )}
      {session.phase === 'solve' && session.hintsShown > 0 && (
        <Card variant="accent">
          <Feedback icon="lightbulb" tone="accent" title={`Hint ${session.hintsShown}`}>
            {session.hintsShown === 1
              ? puzzle.hints[0]
              : session.hintsShown === 2
                ? `Look at the piece on ${expected?.from}.`
                : describeMove(settledFen, puzzle.moves[session.ply])}
          </Feedback>
        </Card>
      )}
      {session.phase === 'replay' && (
        <Card variant="accent">
          <Feedback
            icon="play"
            tone="accent"
            title={`Answer · move ${session.ply} of ${puzzle.moves.length}`}>
            {describeMove(fen, puzzle.moves[session.ply])}
          </Feedback>
        </Card>
      )}
      {session.phase === 'feedback' && (
        <Card variant={lastResult?.independent ? 'success' : 'accent'}>
          <Feedback
            icon={lastResult?.independent ? 'check' : 'sparkles'}
            tone={lastResult?.independent ? 'success' : 'accent'}
            title={lastResult?.independent ? 'Correct!' : 'Solved with help'}
            live>
            {puzzle.explanation}
          </Feedback>
        </Card>
      )}
    </Screen>
  );
}

function RouteProgress({ session }: { session: Session }) {
  return <RoutePath steps={routeSteps(session)} />;
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
        {color === 'w' ? 'White' : 'Black'} to move
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
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  progressLabel: { flex: 1 },
  turn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + Spacing.half },
  turnDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1 },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
  feedback: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  feedbackText: { flex: 1, gap: Spacing.one },
});
