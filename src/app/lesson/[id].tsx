import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { describeMove, INITIAL_POSITION, playMove, positionAfter, readPosition } from '@/chess';
import { Board } from '@/components/board/board';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { guideById } from '@/content';
import { branchForGuide, branchesForGuide, transfersForGuide } from '@/content/lessons';
import { Spacing } from '@/constants/theme';
import { lessonFen, lessonKey, nextLessonReview } from '@/learning/lesson';
import { useProgressStore } from '@/progress/store';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const guide = guideById[id];
  const state = useProgressStore();
  const [chosenMode, setMode] = useState<'learn' | 'practice' | null>(null);
  const [message, setMessage] = useState('');
  if (!guide)
    return (
      <Screen>
        <ThemedText>This guide is unavailable.</ThemedText>
        <Button label="Back to Learn" onPress={() => router.replace('/learn')} />
      </Screen>
    );
  if (!state.hydrated)
    return (
      <Screen>
        <ThemedText>Restoring your guide…</ThemedText>
      </Screen>
    );
  const progress = state.lessonProgress;
  const key = progress.selected[id] ?? lessonKey('branch', id, 'main');
  const session = progress.sessions[key];
  const targetId = session?.targetId ?? key.split('/')[2];
  const transfer = key.startsWith('transfer/')
    ? transfersForGuide(id).find((exercise) => exercise.id === targetId)
    : undefined;
  const branch = branchForGuide(id, transfer ? 'main' : targetId)!;
  const mode = transfer ? 'practice' : (chosenMode ?? (session ? 'practice' : 'learn'));
  const practicing = mode === 'practice' && Boolean(session);
  const done = practicing && session?.phase === 'complete';
  const viewed =
    progress.viewed[lessonKey('branch', id, branch.id)] ??
    (branch.id === 'main' ? (state.guideProgress[id]?.viewedPly ?? 0) : 0);
  const ply = practicing ? session!.ply : viewed;
  const fen = practicing ? lessonFen(session!) : positionAfter(INITIAL_POSITION, branch.moves, ply);
  const hint = practicing && session?.hintShown && !done;
  const expectedMove = !transfer && ply < branch.moves.length ? branch.moves[ply] : undefined;
  const expected = expectedMove ? playMove(fen, expectedMove) : undefined;
  const lastMove =
    !transfer && ply > 0
      ? playMove(positionAfter(INITIAL_POSITION, branch.moves, ply - 1), branch.moves[ply - 1])
      : transfer && session?.acceptedMove
        ? playMove(transfer.fen, session.acceptedMove)
        : undefined;
  const outcome = session
    ? progress.attempts.find((attempt) => attempt.id === session.id)
    : undefined;
  const dueDate = session ? nextLessonReview(progress.attempts, session) : undefined;
  function start(restart = false) {
    state.startLesson(id, transfer ? 'transfer' : 'branch', transfer?.id ?? branch.id, restart);
    setMode('practice');
    setMessage('');
  }
  return (
    <Screen>
      <ThemedText type="smallBold" themeColor="primary">
        {guide.category.toUpperCase()} · {guide.side === 'w' ? 'WHITE' : 'BLACK'}
      </ThemedText>
      <ThemedText type="title" accessibilityRole="header">
        {guide.title}
      </ThemedText>
      <ThemedText themeColor="textSecondary">
        Choose an example reply, learn its plan, then recall it.
      </ThemedText>
      <Card>
        <ThemedText type="subtitle">Example branches</ThemedText>
        {branchesForGuide(id).map((item) => (
          <Button
            key={item.id}
            variant="secondary"
            label={`Choose ${item.title}`}
            onPress={() => {
              state.selectLesson(id, 'branch', item.id);
              state.helpLesson(lessonKey('branch', id, item.id), false);
              setMode('learn');
              setMessage('');
            }}
          />
        ))}
      </Card>
      <ThemedText type="subtitle">{transfer?.title ?? branch.title}</ThemedText>
      {!transfer && (!practicing || done || session?.scaffold === 'guided') && (
        <ThemedText themeColor="textSecondary">{branch.description}</ThemedText>
      )}
      {!transfer && (
        <View style={styles.row}>
          <View style={styles.action}>
            <Button
              variant={mode === 'learn' ? 'primary' : 'secondary'}
              label="Learn line"
              onPress={() => {
                state.helpLesson(key, false);
                setMode('learn');
                setMessage('');
              }}
            />
          </View>
          <View style={styles.action}>
            <Button
              variant={mode === 'practice' ? 'primary' : 'secondary'}
              label="Play line"
              onPress={() => start()}
            />
          </View>
        </View>
      )}
      {practicing && !done && (
        <ThemedText type="smallBold" themeColor="primary">
          {transfer
            ? 'TRANSFER · NEW POSITION'
            : session?.scaffold === 'guided'
              ? 'GUIDED PRACTICE · WITH HELP'
              : 'RECALL · TRY WITHOUT HELP'}
        </ThemedText>
      )}
      {transfer && <ThemedText>{transfer.prompt}</ThemedText>}
      <Board
        key={`${key}-${mode}`}
        fen={fen}
        orientation={transfer ? readPosition(transfer.fen).turn : guide.side}
        interactive={practicing && !done}
        onMove={(move) => state.answerLesson(key, move)}
        onIllegalMove={() => state.wrongLesson(key)}
        lastMove={lastMove}
        hintSquare={hint && !transfer ? expected?.from : undefined}
      />
      {state.lessonNotice?.key === key && (
        <ThemedText accessibilityLiveRegion="polite">{state.lessonNotice.text}</ThemedText>
      )}
      {mode === 'learn' && !transfer && (
        <View style={styles.row}>
          <View style={styles.action}>
            <Button
              variant="secondary"
              label="Previous move"
              disabled={ply === 0}
              onPress={() => state.viewLesson(id, branch.id, ply - 1)}
            />
          </View>
          <View style={styles.action}>
            <Button
              label={ply === branch.moves.length ? 'Practice this line' : 'Next move'}
              onPress={() =>
                ply === branch.moves.length ? start() : state.viewLesson(id, branch.id, ply + 1)
              }
            />
          </View>
        </View>
      )}
      <Card accent>
        <ThemedText type="smallBold">
          {done
            ? transfer
              ? 'Idea practiced'
              : 'Line practiced'
            : mode === 'learn'
              ? `Move ${ply} of ${branch.moves.length}`
              : 'Your move'}
        </ThemedText>
        <ThemedText>
          {done
            ? outcome?.independent
              ? transfer
                ? 'Solved independently, without hints or retries.'
                : 'Recalled independently, without hints or retries.'
              : 'Completed with guidance, hints or retries. Try again without help to check your recall.'
            : mode === 'learn'
              ? ply === 0
                ? 'Step through the example and notice each move’s purpose.'
                : branch.notes[ply - 1]
              : transfer
                ? 'Find a move that fits the goal. Several legal moves may be reasonable.'
                : session?.scaffold === 'guided'
                  ? branch.notes[ply]
                  : 'Recall the next move in a supported example. The answer is hidden until you play it or ask for help.'}
        </ThemedText>
        {hint && (
          <ThemedText type="smallBold">
            {transfer ? transfer.hint : describeMove(fen, branch.moves[ply])}
          </ThemedText>
        )}
        {done && transfer && <ThemedText>{transfer.explanation}</ThemedText>}
        {done && dueDate && (
          <ThemedText type="small">
            Next recall review: {dueDate}. Practicing early will not postpone it.
          </ThemedText>
        )}
      </Card>
      {session?.lastWrong && practicing && !done && (
        <ThemedText accessibilityLiveRegion="polite">
          {transfer
            ? 'This move is not one of the checked examples for this goal. It may still be playable; try another move or ask for a hint.'
            : 'Try another supported example move. A legal move outside these examples is not necessarily a bad chess move.'}
        </ThemedText>
      )}
      {message ? <ThemedText accessibilityLiveRegion="polite">{message}</ThemedText> : null}
      {practicing && !done && (
        <Button
          variant="secondary"
          label={transfer ? 'Show idea hint' : 'Show move hint'}
          onPress={() => state.helpLesson(key)}
        />
      )}
      {practicing && done && (
        <Button
          label={transfer ? 'Try idea without help' : 'Recall line without help'}
          onPress={() => start(true)}
        />
      )}
      {practicing && done && (
        <Button
          variant="secondary"
          label="Back to Learn"
          onPress={() => router.replace('/learn')}
        />
      )}
      {(!practicing || done) && !transfer && (
        <>
          <Card>
            <ThemedText type="subtitle">The idea</ThemedText>
            <ThemedText>{guide.idea}</ThemedText>
          </Card>
          <Card>
            <ThemedText type="subtitle">In your next game</ThemedText>
            {guide.plans.map((plan) => (
              <ThemedText key={plan}>• {plan}</ThemedText>
            ))}
          </Card>
          <Card>
            <ThemedText type="subtitle">Common mistakes</ThemedText>
            {guide.mistakes.map((mistake) => (
              <ThemedText key={mistake}>• {mistake}</ThemedText>
            ))}
          </Card>
        </>
      )}
      <Card>
        <ThemedText type="subtitle">Use the idea in a new position</ThemedText>
        <ThemedText themeColor="textSecondary">
          Try a separate position, then return for a later recall check.
        </ThemedText>
        {transfersForGuide(id).map((exercise) => (
          <Button
            key={exercise.id}
            variant="secondary"
            label={`Try ${exercise.title}`}
            onPress={() => {
              state.startLesson(id, 'transfer', exercise.id);
              setMode('practice');
              setMessage('');
            }}
          />
        ))}
      </Card>
      <ThemedText type="small" themeColor="textSecondary">
        These are checked examples, not a forced script or an evaluation of every legal move.
      </ThemedText>
      <Button
        variant="secondary"
        label="Opening reference"
        onPress={() => {
          void Linking.openURL(transfer?.sourceUrl ?? branch.sourceUrl).catch(() =>
            setMessage(
              'The reference needs an internet connection. The lesson itself works offline.',
            ),
          );
        }}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
});
