import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ActivityBar } from '@/components/activity-bar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { guides, puzzles } from '@/content';
import { Spacing } from '@/constants/theme';
import { lessonTarget } from '@/learning/lesson';
import { nextLesson } from '@/learning/next-lesson';
import { useProgressStore } from '@/progress/store';
import { useLocalDate } from '@/hooks/use-local-date';
import { getGreeting } from '@/utils/greeting';
import { reviewQueue } from '@/workout/review';

export default function HomeScreen() {
  const today = useLocalDate();
  const hydrated = useProgressStore((state) => state.hydrated);
  const session = useProgressStore((state) => state.currentSession);
  const attempts = useProgressStore((state) => state.attempts);
  const completions = useProgressStore((state) => state.completions);
  const lessonProgress = useProgressStore((state) => state.guideProgress);
  const lessons = useProgressStore((state) => state.lessonProgress);
  const selectLesson = useProgressStore((state) => state.selectLesson);
  const startLesson = useProgressStore((state) => state.startLesson);
  const start = useProgressStore((state) => state.startPractice);
  const unfinished = session && session.phase !== 'complete';
  const doneToday = completions.some((completion) => completion.dateKey === today);
  const reviews = reviewQueue(attempts, today).length;
  const learned = guides.filter((guide) => lessonProgress[guide.id]?.completedAt).length;
  const step = nextLesson(lessons, today);
  const target = step ? lessonTarget(step.guideId, step.kind, step.targetId) : undefined;
  function openPractice(review = false) {
    if (start(review ? 'review' : 'daily')) router.push('/workout');
  }
  function openLesson() {
    if (!step || !hydrated) return;
    if (step.reason === 'learn') selectLesson(step.guideId, step.kind, step.targetId);
    else startLesson(step.guideId, step.kind, step.targetId, step.reason === 'review');
    router.push({ pathname: '/lesson/[id]', params: { id: step.guideId } });
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
            : 'Spot a mate, win a piece, find a fork. Your round can include earlier puzzles to help you remember.'}
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
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Revisit puzzles ready to try again, including ones you solved without help. Puzzles
              you needed help with are ready for another try now. Try to solve them without hints or
              retries. Up to 10 per round.
            </ThemedText>
            <Button
              variant="secondary"
              label={`Review ${reviews} puzzle${reviews === 1 ? '' : 's'}`}
              onPress={() => openPractice(true)}
            />
          </>
        )}
      </Card>
      <Card>
        <ThemedText type="smallBold" themeColor="primary">
          LEARN · YOUR NEXT STEP
        </ThemedText>
        <ThemedText type="subtitle">
          {step ? guides.find((guide) => guide.id === step.guideId)!.title : 'Keep the ideas fresh'}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {step
            ? {
                resume: 'Continue your saved lesson. Your earlier hints and retries stay recorded.',
                review: 'This lesson is ready for a later recall check. Try it without help.',
                apply:
                  'You practiced an opening line. Try using its idea in an unfamiliar position.',
                learn: 'Follow the demonstration, then play the example with guidance.',
              }[step.reason]
            : 'You have tried every example. Return for scheduled recall or explore a guide again.'}
        </ThemedText>
        <ThemedText type="small">
          {learned} of {guides.length} guides practiced
        </ThemedText>
        {step && target && (
          <>
            <ThemedText type="smallBold">{target.title}</ThemedText>
            <Button
              disabled={!hydrated}
              label={
                !hydrated
                  ? 'Restoring your lessons…'
                  : {
                      resume: 'Resume lesson',
                      review: 'Recall this lesson',
                      apply: 'Apply this idea',
                      learn: 'Learn this line',
                    }[step.reason]
              }
              onPress={openLesson}
            />
          </>
        )}
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
