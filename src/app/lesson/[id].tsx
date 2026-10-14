import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { describeMove, INITIAL_POSITION, playMove, positionAfter } from '@/chess';
import { Board } from '@/components/board/board';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { guideById } from '@/content';
import { Spacing } from '@/constants/theme';
import { useProgressStore } from '@/progress/store';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const guide = guideById[id];
  const saved = useProgressStore((state) => state.guideProgress[id]);
  const save = useProgressStore((state) => state.saveGuide);
  const hydrated = useProgressStore((state) => state.hydrated);
  const [mode, setMode] = useState<'learn' | 'practice'>('learn');
  const [message, setMessage] = useState('');
  const [hintShown, setHintShown] = useState(false);
  if (!guide)
    return (
      <Screen>
        <ThemedText>This guide is unavailable.</ThemedText>
        <Button label="Back to Learn" onPress={() => router.replace('/learn')} />
      </Screen>
    );
  if (!hydrated)
    return (
      <Screen>
        <ThemedText>Restoring your guide…</ThemedText>
      </Screen>
    );
  const ply =
    mode === 'learn'
      ? (saved?.viewedPly ?? 0)
      : (saved?.practicePly ?? (guide.side === 'b' ? 1 : 0));
  const done = ply >= guide.moves.length;
  const fen = positionAfter(INITIAL_POSITION, guide.moves, ply);
  const lastMove =
    ply > 0
      ? playMove(positionAfter(INITIAL_POSITION, guide.moves, ply - 1), guide.moves[ply - 1])
      : undefined;
  const expected = !done ? playMove(fen, guide.moves[ply]) : undefined;
  function practiceMove(move: string) {
    if (done) return;
    if (move !== guide.moves[ply]) {
      setMessage(
        'That is a legal move. This exercise follows the example line; try the suggested move.',
      );
      return;
    }
    const next = Math.min(guide.moves.length, ply + 2);
    save(id, {
      practicePly: next,
      ...(next === guide.moves.length ? { completedAt: new Date().toISOString() } : {}),
    });
    setMessage(
      next === guide.moves.length
        ? 'Line practiced. Carry the ideas into your next game.'
        : 'Good. The example reply is shown; now play your next move.',
    );
    setHintShown(false);
  }
  return (
    <Screen>
      <ThemedText type="smallBold" themeColor="primary">
        {guide.category.toUpperCase()} · {guide.side === 'w' ? 'WHITE' : 'BLACK'}
      </ThemedText>
      <ThemedText type="title" accessibilityRole="header">
        {guide.title}
      </ThemedText>
      <View style={styles.row}>
        <View style={styles.action}>
          <Button
            variant={mode === 'learn' ? 'primary' : 'secondary'}
            label="Learn line"
            onPress={() => {
              setMode('learn');
              setMessage('');
              setHintShown(false);
            }}
          />
        </View>
        <View style={styles.action}>
          <Button
            variant={mode === 'practice' ? 'primary' : 'secondary'}
            label="Play line"
            onPress={() => {
              setMode('practice');
              setMessage('');
              setHintShown(false);
            }}
          />
        </View>
      </View>
      <Board
        fen={fen}
        orientation={guide.side}
        interactive={mode === 'practice' && !done}
        onMove={practiceMove}
        onIllegalMove={() => setMessage('Choose a highlighted square to make a legal move.')}
        lastMove={lastMove}
        hintSquare={hintShown ? expected?.from : undefined}
      />
      {mode === 'learn' && (
        <View style={styles.row}>
          <View style={styles.action}>
            <Button
              variant="secondary"
              label="Previous move"
              disabled={ply === 0}
              onPress={() => save(id, { viewedPly: ply - 1 })}
            />
          </View>
          <View style={styles.action}>
            <Button
              label={done ? 'Practice this line' : 'Next move'}
              onPress={() => {
                if (done) setMode('practice');
                else save(id, { viewedPly: ply + 1 });
              }}
            />
          </View>
        </View>
      )}
      <Card accent>
        <ThemedText type="smallBold">
          {mode === 'learn'
            ? `Move ${ply} of ${guide.moves.length}`
            : done
              ? 'Line practiced'
              : `Your move · ${guide.side === 'w' ? 'White' : 'Black'} to play`}
        </ThemedText>
        <ThemedText>
          {mode === 'learn'
            ? ply === 0
              ? 'Start from the initial position. Step through the example and notice each move’s purpose.'
              : guide.notes[ply - 1]
            : done
              ? 'You followed this example. Review the plans below before using the opening in a game.'
              : guide.notes[ply]}
        </ThemedText>
        {hintShown && !done && (
          <ThemedText type="smallBold">{describeMove(fen, guide.moves[ply])}</ThemedText>
        )}
      </Card>
      {message ? <ThemedText accessibilityLiveRegion="polite">{message}</ThemedText> : null}
      {mode === 'practice' && (
        <>
          {!done && (
            <Button variant="secondary" label="Show move hint" onPress={() => setHintShown(true)} />
          )}
          <Button
            variant="secondary"
            label="Restart practice"
            onPress={() => {
              save(id, { practicePly: guide.side === 'b' ? 1 : 0 });
              setMessage('');
              setHintShown(false);
            }}
          />
          {done && <Button label="Back to Learn" onPress={() => router.replace('/learn')} />}
        </>
      )}
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
      <ThemedText type="small" themeColor="textSecondary">
        This is one example. If your opponent chooses another move, check the threats and use the
        plan rather than forcing the line.
      </ThemedText>
      <Button
        variant="secondary"
        label="Opening reference"
        onPress={() => {
          void Linking.openURL(guide.sourceUrl).catch(() =>
            setMessage(
              'The reference needs an internet connection. The guide itself works offline.',
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
