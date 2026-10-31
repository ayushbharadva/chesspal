import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { describeMove, INITIAL_POSITION, playMove, positionAfter, readPosition } from '@/chess';
import { Board } from '@/components/board/board';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { type IconName } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Bullet, Chip, IconBadge, ListRow, Pill, SectionTitle, Segmented } from '@/components/ui';
import { guideById } from '@/content';
import { branchForGuide, branchesForGuide, transfersForGuide } from '@/content/lessons';
import { Spacing } from '@/constants/theme';
import { lessonFen, lessonKey, nextLessonReview } from '@/learning/lesson';
import { useHaptics } from '@/hooks/use-haptics';
import { useReplyPause } from '@/hooks/use-reply-pause';
import { useProgressStore } from '@/progress/store';
import { CHIME_DELAY_MS, playSound } from '@/sounds/play-sound';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const guide = guideById[id];
  const state = useProgressStore();
  const [chosenMode, setMode] = useState<'learn' | 'practice' | null>(null);
  const [message, setMessage] = useState('');
  const haptic = useHaptics();
  const activeKey = state.lessonProgress.selected[id] ?? lessonKey('branch', id, 'main');
  const activeSession = state.lessonProgress.sessions[activeKey];
  const pausing = useReplyPause(
    activeKey,
    activeSession?.ply ?? 0,
    activeSession?.phase === 'solve',
  );
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
  // Rest on the player's move for a moment before showing the opponent's reply.
  const replying = pausing && practicing && !transfer && ply >= 2;
  const fen = replying
    ? positionAfter(INITIAL_POSITION, branch.moves, ply - 1)
    : practicing
      ? lessonFen(session!)
      : positionAfter(INITIAL_POSITION, branch.moves, ply);
  const hint = practicing && session?.hintShown && !done;
  const expectedMove = !transfer && ply < branch.moves.length ? branch.moves[ply] : undefined;
  const expected = expectedMove && !replying ? playMove(fen, expectedMove) : undefined;
  const lastMove = replying
    ? playMove(positionAfter(INITIAL_POSITION, branch.moves, ply - 2), branch.moves[ply - 2])
    : !transfer && ply > 0
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
  const modeLabel = transfer
    ? 'TRANSFER · NEW POSITION'
    : session?.scaffold === 'guided'
      ? 'GUIDED PRACTICE · WITH HELP'
      : 'RECALL · TRY WITHOUT HELP';
  return (
    <Screen>
      <View style={styles.intro}>
        <ThemedText type="overline" themeColor="accent">
          {guide.category} · {guide.side === 'w' ? 'White' : 'Black'}
        </ThemedText>
        <ThemedText type="title" accessibilityRole="header">
          {guide.title}
        </ThemedText>
        {!practicing && (
          <ThemedText themeColor="textSecondary">
            Choose an example reply, learn its plan, then recall it.
          </ThemedText>
        )}
      </View>
      <SectionTitle>Example branches</SectionTitle>
      {/* One scrolling row, so the board stays on screen while playing. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipRow}
        contentContainerStyle={styles.chips}>
        {branchesForGuide(id).map((item) => (
          <Chip
            key={item.id}
            label={item.title}
            accessibilityLabel={`Choose ${item.title}`}
            selected={!transfer && item.id === branch.id}
            onPress={() => {
              state.selectLesson(id, 'branch', item.id);
              state.helpLesson(lessonKey('branch', id, item.id), false);
              setMode('learn');
              setMessage('');
            }}
          />
        ))}
      </ScrollView>
      <View style={styles.lineHeading}>
        <ThemedText type="headline">{transfer?.title ?? branch.title}</ThemedText>
        {!transfer && (!practicing || done || session?.scaffold === 'guided') && (
          <ThemedText themeColor="textSecondary">{branch.description}</ThemedText>
        )}
      </View>
      {!transfer && (
        <Segmented
          value={mode}
          options={[
            { value: 'learn', label: 'Learn line', icon: 'book-open' },
            { value: 'practice', label: 'Play line', icon: 'play' },
          ]}
          onChange={(next) => {
            if (next === 'practice') return start();
            state.helpLesson(key, false);
            setMode('learn');
            setMessage('');
          }}
        />
      )}
      {practicing && !done && (
        <Pill
          label={modeLabel}
          icon={transfer ? 'target' : session?.scaffold === 'guided' ? 'lightbulb' : 'sparkles'}
          tone="accent"
        />
      )}
      {transfer && <ThemedText>{transfer.prompt}</ThemedText>}
      <Board
        key={`${key}-${mode}`}
        fen={fen}
        orientation={transfer ? readPosition(transfer.fen).turn : guide.side}
        interactive={practicing && !done && !replying}
        onMove={(move) => {
          state.answerLesson(key, move);
          const after = useProgressStore.getState().lessonProgress;
          const played = after.sessions[after.selected[id]];
          haptic(played?.phase === 'complete' ? 'success' : played?.lastWrong ? 'error' : 'tick');
          if (played?.phase === 'complete') setTimeout(() => playSound('correct'), CHIME_DELAY_MS);
          else if (played?.lastWrong) playSound('wrong');
        }}
        onIllegalMove={() => {
          haptic('error');
          state.wrongLesson(key);
        }}
        lastMove={lastMove}
        shakeKey={practicing ? (session?.mistakes ?? 0) : 0}
        hintSquare={hint && !transfer ? expected?.from : undefined}
      />
      {state.lessonNotice?.key === key && (
        <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
          {state.lessonNotice.text}
        </ThemedText>
      )}
      {mode === 'learn' && !transfer && (
        <View style={styles.row}>
          <View style={styles.action}>
            <Button
              size="compact"
              variant="secondary"
              label="Previous move"
              disabled={ply === 0}
              onPress={() => state.viewLesson(id, branch.id, ply - 1)}
            />
          </View>
          <View style={styles.action}>
            <Button
              size="compact"
              icon={ply === branch.moves.length ? 'play' : 'arrow-right'}
              label={ply === branch.moves.length ? 'Practice this line' : 'Next move'}
              onPress={() =>
                ply === branch.moves.length ? start() : state.viewLesson(id, branch.id, ply + 1)
              }
            />
          </View>
        </View>
      )}
      <Card variant={done ? (outcome?.independent ? 'success' : 'accent') : 'accent'}>
        <View style={styles.status}>
          <IconBadge
            name={done ? 'check' : mode === 'learn' ? 'book-open' : 'target'}
            tone={done && outcome?.independent ? 'success' : 'accent'}
            size={36}
            solid
          />
          <View style={styles.statusText}>
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
              <ThemedText type="smallBold" themeColor="accent">
                {transfer
                  ? transfer.hint
                  : describeMove(
                      positionAfter(INITIAL_POSITION, branch.moves, ply),
                      branch.moves[ply],
                    )}
              </ThemedText>
            )}
            {done && transfer && <ThemedText>{transfer.explanation}</ThemedText>}
            {done && dueDate && (
              <ThemedText type="small" themeColor="textSecondary">
                Next recall review: {dueDate}. Practicing early will not postpone it.
              </ThemedText>
            )}
          </View>
        </View>
      </Card>
      {session?.lastWrong && practicing && !done && (
        <Card variant="danger">
          <View style={styles.status}>
            <IconBadge name="x" tone="danger" size={36} solid />
            <ThemedText style={styles.statusText} accessibilityLiveRegion="polite">
              {transfer
                ? 'This move is not one of the checked examples for this goal. It may still be playable; try another move or ask for a hint.'
                : 'Try another supported example move. A legal move outside these examples is not necessarily a bad chess move.'}
            </ThemedText>
          </View>
        </Card>
      )}
      {message ? (
        <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
          {message}
        </ThemedText>
      ) : null}
      {practicing && !done && (
        <Button
          variant="secondary"
          icon="lightbulb"
          label={transfer ? 'Show idea hint' : 'Show move hint'}
          onPress={() => state.helpLesson(key)}
        />
      )}
      {practicing && done && (
        <Button
          icon="rotate-ccw"
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
            <CardHeading icon="sparkles" title="The idea" />
            <ThemedText>{guide.idea}</ThemedText>
          </Card>
          <Card>
            <CardHeading icon="target" title="In your next game" />
            {guide.plans.map((plan) => (
              <Bullet key={plan}>{plan}</Bullet>
            ))}
          </Card>
          <Card>
            <CardHeading icon="alert" title="Common mistakes" />
            {guide.mistakes.map((mistake) => (
              <Bullet key={mistake}>{mistake}</Bullet>
            ))}
          </Card>
        </>
      )}
      <SectionTitle>Use the idea in a new position</SectionTitle>
      <ThemedText type="small" themeColor="textSecondary">
        Try a separate position, then return for a later recall check.
      </ThemedText>
      {transfersForGuide(id).map((exercise) => (
        <ListRow
          key={exercise.id}
          icon="puzzle"
          title={exercise.title}
          accessibilityLabel={`Try ${exercise.title}`}
          onPress={() => {
            state.startLesson(id, 'transfer', exercise.id);
            setMode('practice');
            setMessage('');
          }}
        />
      ))}
      <ThemedText type="small" themeColor="textSecondary">
        These are checked examples, not a forced script or an evaluation of every legal move.
      </ThemedText>
      <Button
        variant="ghost"
        icon="external-link"
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

function CardHeading({ icon, title }: { icon: IconName; title: string }) {
  return (
    <View style={styles.cardHeading}>
      <IconBadge name={icon} size={32} />
      <ThemedText type="headline">{title}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { gap: Spacing.two, paddingTop: Spacing.two },
  chipRow: { flexGrow: 0 },
  chips: { flexDirection: 'row', gap: Spacing.two },
  lineHeading: { gap: Spacing.one, paddingTop: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
  status: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  statusText: { flex: 1, gap: Spacing.one },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
});
