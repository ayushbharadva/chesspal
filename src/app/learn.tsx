import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { INITIAL_POSITION, positionAfter } from '@/chess';
import { MiniBoard } from '@/components/board/mini-board';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { IconBadge, ListRow, Pill, SectionTitle } from '@/components/ui';
import { guideById, guides } from '@/content';
import { branchesForGuide, transfersForGuide } from '@/content/lessons';
import { Spacing } from '@/constants/theme';
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
      <View style={styles.intro}>
        <ThemedText type="title" accessibilityRole="header">
          Learn the ideas.
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Learn common replies with guidance, recall without hints, then use the idea in a new
          position.
        </ThemedText>
      </View>
      {reviews.length > 0 && (
        <Card variant="accent">
          <View style={styles.reviewHeader}>
            <IconBadge name="rotate-ccw" size={40} solid />
            <View style={styles.reviewTitle}>
              <ThemedText type="headline">Ready for recall · {reviews.length}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                A later check helps distinguish remembering from following hints.
              </ThemedText>
            </View>
          </View>
          {reviews.map(({ attempt }) => {
            const key = lessonKey(attempt.kind, attempt.guideId, attempt.targetId);
            const title = lessonTarget(attempt.guideId, attempt.kind, attempt.targetId)!.title;
            const guideTitle = guideById[attempt.guideId].title;
            return (
              <ListRow
                key={key}
                title={title}
                detail={guideTitle}
                accessibilityLabel={`Review ${guideTitle}: ${title}`}
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
      <SectionTitle>Opening guides</SectionTitle>
      {guides.map((guide) => {
        const status = progress[guide.id]?.completedAt
          ? 'Practiced'
          : progress[guide.id]?.viewedPly
            ? 'In progress'
            : 'Beginner guide';
        return (
          <Card key={guide.id}>
            <View style={styles.guideHeader}>
              <MiniBoard
                fen={positionAfter(INITIAL_POSITION, guide.moves)}
                orientation={guide.side}
                size={92}
              />
              <View style={styles.guideTitle}>
                <ThemedText type="overline" themeColor="accent">
                  {guide.category} · Play as {guide.side === 'w' ? 'White' : 'Black'}
                </ThemedText>
                <ThemedText type="headline">{guide.title}</ThemedText>
                <Pill
                  label={status}
                  icon={status === 'Practiced' ? 'check' : undefined}
                  tone={status === 'Practiced' ? 'success' : 'muted'}
                />
              </View>
            </View>
            <ThemedText themeColor="textSecondary">{guide.description}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {branchesForGuide(guide.id).length} example branches ·{' '}
              {transfersForGuide(guide.id).length} new positions
            </ThemedText>
            <Button
              variant="secondary"
              icon="arrow-right"
              label={`Open ${guide.title}`}
              onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: guide.id } })}
            />
          </Card>
        );
      })}
      <ThemedText type="small" themeColor="textSecondary">
        Opponents can choose different replies. These examples teach plans rather than a forced
        script for every game. Guided completions and independent recalls are recorded separately.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: Spacing.two, paddingTop: Spacing.two },
  reviewHeader: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  reviewTitle: { flex: 1, gap: Spacing.one },
  guideHeader: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  guideTitle: { flex: 1, gap: Spacing.one + Spacing.half },
});
