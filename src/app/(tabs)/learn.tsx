import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { LessonRow, StarRow } from '@/components/course/lesson-row';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Pill, ProgressBar } from '@/components/ui';
import { courseLessons, courseSections } from '@/content/course';
import { Spacing } from '@/constants/theme';
import { bestStars, lessonStatus, nextCourseLesson, starTotals } from '@/course/path';
import { useProgressStore } from '@/progress/store';

export default function LearnScreen() {
  const hydrated = useProgressStore((state) => state.hydrated);
  const course = useProgressStore((state) => state.courseProgress);
  const startCourse = useProgressStore((state) => state.startCourse);
  const best = bestStars(course.results);
  const next = nextCourseLesson(best);
  const totals = starTotals(
    courseLessons.map((entry) => entry.lesson.id),
    best,
  );
  const resuming = next && course.current?.lessonId === next.lesson.id;

  function open(lessonId: string) {
    if (startCourse(lessonId)) router.push({ pathname: '/course/[id]', params: { id: lessonId } });
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={styles.intro}>
        <View style={styles.titleRow}>
          <ThemedText type="title" accessibilityRole="header">
            Learn
          </ThemedText>
          <View accessible accessibilityLabel={`${totals.stars} stars earned`}>
            <Pill
              icon="star"
              tone={totals.stars ? 'accent' : 'muted'}
              label={String(totals.stars)}
            />
          </View>
        </View>
        <ThemedText themeColor="textSecondary">From the rules to advanced play.</ThemedText>
      </View>

      {hydrated && (
        <Card variant="hero">
          <Pill
            tone="onHero"
            icon="graduation-cap"
            label={next ? `${next.section.title} · ${next.unit.title}` : 'Course complete'}
          />
          <View style={styles.heroText}>
            <ThemedText type="title" themeColor="onHero">
              {next ? next.lesson.title : 'Every lesson done'}
            </ThemedText>
            <ThemedText themeColor="onHeroSecondary">
              {next
                ? `Lesson ${next.index + 1} of ${courseLessons.length}`
                : 'Replay any lesson to earn more stars.'}
            </ThemedText>
          </View>
          <ProgressBar
            value={totals.finished / courseLessons.length}
            track="heroOverlay"
            fill="heroAccent"
          />
          {next && (
            <Button
              variant="accent"
              icon="play"
              label={resuming ? 'Continue' : 'Start'}
              onPress={() => open(next.lesson.id)}
            />
          )}
        </Card>
      )}

      {courseSections.map((section, sectionIndex) => (
        <View key={section.id} style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="overline" themeColor="accent">
              Section {sectionIndex + 1}
            </ThemedText>
            <ThemedText type="headline" accessibilityRole="header">
              {section.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {section.summary}
            </ThemedText>
          </View>
          {section.units.map((unit) => {
            const ids = unit.lessons.map((lesson) => lesson.id);
            const unitTotals = starTotals(ids, best);
            return (
              <Card key={unit.id}>
                <View style={styles.unitHeader}>
                  <ThemedText type="subtitle" style={styles.unitTitle}>
                    {unit.title}
                  </ThemedText>
                  {unitTotals.finished === ids.length ? (
                    <StarRow stars={Math.floor(unitTotals.stars / ids.length)} />
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary">
                      {unitTotals.finished} / {ids.length}
                    </ThemedText>
                  )}
                </View>
                <View>
                  {unit.lessons.map((lesson, index) => {
                    const entry = courseLessons.find((item) => item.lesson.id === lesson.id)!;
                    return (
                      <LessonRow
                        key={lesson.id}
                        number={entry.index + 1}
                        title={lesson.title}
                        status={lessonStatus(lesson.id, best)}
                        stars={best[lesson.id]}
                        last={index === unit.lessons.length - 1}
                        onPress={() => open(lesson.id)}
                      />
                    );
                  })}
                </View>
              </Card>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: Spacing.one, paddingTop: Spacing.two },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroText: { gap: Spacing.two, paddingRight: Spacing.five },
  section: { gap: Spacing.three, marginTop: Spacing.two },
  sectionHeader: { gap: Spacing.one },
  unitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  unitTitle: { flex: 1 },
});
