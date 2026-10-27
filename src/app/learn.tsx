import { router } from 'expo-router';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { guideById, guides } from '@/content';
import { branchesForGuide, transfersForGuide } from '@/content/lessons';
import { lessonKey, lessonReviews, lessonTarget } from '@/learning/lesson';
import { useProgressStore } from '@/progress/store';
import { useLocalDate } from '@/hooks/use-local-date';

export default function LearnScreen() {
  const today = useLocalDate();
  const progress = useProgressStore((state) => state.guideProgress);
  const lessons = useProgressStore((state) => state.lessonProgress);
  const start = useProgressStore((state) => state.startLesson);
  const reviews = lessonReviews(lessons.attempts, today);
  return (
    <Screen>
      <ThemedText type="title" accessibilityRole="header">
        Learn the ideas.
      </ThemedText>
      <ThemedText themeColor="textSecondary">
        Learn common replies with guidance, recall without hints, then use the idea in a new
        position.
      </ThemedText>
      {reviews.length > 0 && (
        <Card accent>
          <ThemedText type="subtitle">Ready for recall · {reviews.length}</ThemedText>
          <ThemedText themeColor="textSecondary">
            A later check helps distinguish remembering from following hints.
          </ThemedText>
          {reviews.map(({ attempt }) => {
            const key = lessonKey(attempt.kind, attempt.guideId, attempt.targetId);
            const title = lessonTarget(attempt.guideId, attempt.kind, attempt.targetId)!.title;
            return (
              <Button
                key={key}
                label={`Review ${guideById[attempt.guideId].title}: ${title}`}
                onPress={() => {
                  start(
                    attempt.guideId,
                    attempt.kind,
                    attempt.targetId,
                    lessons.sessions[key]?.phase !== 'solve',
                  );
                  router.push({ pathname: '/lesson/[id]', params: { id: attempt.guideId } });
                }}
              />
            );
          })}
        </Card>
      )}
      {guides.map((guide) => (
        <Card key={guide.id}>
          <ThemedText type="smallBold" themeColor="primary">
            {guide.category.toUpperCase()} · PLAY AS {guide.side === 'w' ? 'WHITE' : 'BLACK'}
          </ThemedText>
          <ThemedText type="subtitle">{guide.title}</ThemedText>
          <ThemedText themeColor="textSecondary">{guide.description}</ThemedText>
          <ThemedText type="small">
            {branchesForGuide(guide.id).length} example branches ·{' '}
            {transfersForGuide(guide.id).length} new positions ·{' '}
            {progress[guide.id]?.completedAt
              ? 'Practiced'
              : progress[guide.id]?.viewedPly
                ? 'In progress'
                : 'Beginner guide'}
          </ThemedText>
          <Button
            variant="secondary"
            label={`Open ${guide.title}`}
            onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: guide.id } })}
          />
        </Card>
      ))}
      <ThemedText type="small" themeColor="textSecondary">
        Opponents can choose different replies. These examples teach plans rather than a forced
        script for every game. Guided completions and independent recalls are recorded separately.
      </ThemedText>
    </Screen>
  );
}
