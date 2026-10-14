import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ActivityBar } from '@/components/activity-bar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { guides, puzzles } from '@/content';
import { Spacing } from '@/constants/theme';
import { useProgressStore } from '@/progress/store';
import { dateKey } from '@/utils/date-key';
import { getGreeting } from '@/utils/greeting';
import { latestAttempts } from '@/workout/session';

export default function HomeScreen() {
  const hydrated = useProgressStore((state) => state.hydrated);
  const session = useProgressStore((state) => state.currentSession);
  const attempts = useProgressStore((state) => state.attempts);
  const completions = useProgressStore((state) => state.completions);
  const lessonProgress = useProgressStore((state) => state.guideProgress);
  const start = useProgressStore((state) => state.startPractice);
  const unfinished = session && session.phase !== 'complete';
  const doneToday = completions.some((completion) => completion.dateKey === dateKey());
  const reviews = [...latestAttempts(attempts).values()].filter(
    (attempt) => !attempt.independent,
  ).length;
  const learned = guides.filter((guide) => lessonProgress[guide.id]?.completedAt).length;
  function openPractice(review = false) {
    if (start(review ? 'review' : 'daily')) router.push('/workout');
  }
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          ROOKIE REPS
        </ThemedText>
        <ThemedText type="title" accessibilityRole="header">
          {getGreeting(new Date().getHours())}.
        </ThemedText>
        <ThemedText themeColor="textSecondary">Small reps. Better chess.</ThemedText>
      </View>
      <Card accent>
        <ThemedText type="smallBold" themeColor="primary">
          PRACTICE · BEGINNER
        </ThemedText>
        <ThemedText type="subtitle">
          {unfinished
            ? 'Pick up where you left off'
            : doneToday
              ? 'Ready for another round?'
              : 'Your next 10 puzzles'}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {unfinished
            ? `${session.results.length} of ${session.puzzleIds.length} puzzles completed. Your place is saved.`
            : 'Spot a mate, win a piece, find a fork. Take your time and understand each move.'}
        </ThemedText>
        <Button
          disabled={!hydrated}
          label={
            !hydrated
              ? 'Loading your progress…'
              : unfinished
                ? 'Resume practice'
                : doneToday
                  ? 'Keep practicing'
                  : 'Start practice'
          }
          onPress={() => openPractice()}
        />
        {!unfinished && reviews > 0 && (
          <Button
            variant="secondary"
            label={`Review ${reviews} puzzle${reviews === 1 ? '' : 's'}`}
            onPress={() => openPractice(true)}
          />
        )}
      </Card>
      <Card>
        <ThemedText type="smallBold" themeColor="primary">
          LEARN · OPENINGS
        </ThemedText>
        <ThemedText type="subtitle">Understand the first moves</ThemedText>
        <ThemedText themeColor="textSecondary">
          Explore an opening, a defence and a gambit. Learn their ideas, then play the line
          yourself.
        </ThemedText>
        <ThemedText type="small">
          {learned} of {guides.length} guides practiced
        </ThemedText>
        <Button variant="secondary" label="Explore guides" onPress={() => router.push('/learn')} />
      </Card>
      <ActivityBar />
      <Button variant="secondary" label="Your progress" onPress={() => router.push('/progress')} />
      <ThemedText type="small" themeColor="textSecondary">
        {puzzles.length} starter puzzles · Works offline · No daily limit
      </ThemedText>
    </Screen>
  );
}
const styles = StyleSheet.create({ header: { gap: Spacing.one, paddingVertical: Spacing.three } });
