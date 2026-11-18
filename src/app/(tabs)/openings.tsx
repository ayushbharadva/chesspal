import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { INITIAL_POSITION, positionAfter } from '@/chess';
import { MiniBoard } from '@/components/board/mini-board';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { IconBadge, ListRow, Pill, SectionTitle } from '@/components/ui';
import { guideById, guides } from '@/content';
import { Spacing } from '@/constants/theme';
import { lessonKey, lessonReviews, lessonTarget } from '@/learning/lesson';
import { useProgressStore } from '@/progress/store';
import { useLocalDate } from '@/hooks/use-local-date';

export default function OpeningsScreen() {
  const today = useLocalDate();
  const progress = useProgressStore((state) => state.guideProgress);
  const lessons = useProgressStore((state) => state.lessonProgress);
  const start = useProgressStore((state) => state.startLesson);
  const reviews = lessonReviews(lessons.attempts, today);
  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={styles.intro}>
        <ThemedText type="title" accessibilityRole="header">
          Openings
        </ThemedText>
        <ThemedText themeColor="textSecondary">Good first moves, one step at a time.</ThemedText>
      </View>
      {reviews.length > 0 && (
        <Card variant="accent">
          <View style={styles.reviewHeader}>
            <IconBadge name="rotate-ccw" size={40} solid />
            <View style={styles.reviewTitle}>
              <ThemedText type="headline">Ready to review · {reviews.length}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Play these from memory.
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
      <SectionTitle>Guides</SectionTitle>
      {guides.map((guide) => {
        const status = progress[guide.id]?.completedAt
          ? 'Practiced'
          : progress[guide.id]?.viewedPly
            ? 'Started'
            : 'New';
        return (
          <Pressable
            key={guide.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${guide.title}`}
            onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: guide.id } })}
            style={({ pressed }) => pressed && styles.pressed}>
            <Card>
              <View style={styles.guide}>
                <MiniBoard
                  fen={positionAfter(INITIAL_POSITION, guide.moves)}
                  orientation={guide.side}
                  size={88}
                />
                <View style={styles.guideText}>
                  <ThemedText type="label" themeColor="accent">
                    Play as {guide.side === 'w' ? 'White' : 'Black'}
                  </ThemedText>
                  <ThemedText type="headline">{guide.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {guide.description}
                  </ThemedText>
                  <Pill
                    label={status}
                    icon={status === 'Practiced' ? 'check' : undefined}
                    tone={
                      status === 'Practiced' ? 'success' : status === 'New' ? 'accent' : 'muted'
                    }
                  />
                </View>
                <Icon name="chevron-right" size={20} color="textSecondary" />
              </View>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: Spacing.one, paddingTop: Spacing.two },
  reviewHeader: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  reviewTitle: { flex: 1, gap: Spacing.one },
  guide: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  guideText: { flex: 1, gap: Spacing.one },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
