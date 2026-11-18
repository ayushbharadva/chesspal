import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import {
  CaptureStep,
  MoveStep,
  PlayStep,
  PuzzlesStep,
  StarsStep,
  TapStep,
} from '@/components/course/board-steps';
import { StarRow } from '@/components/course/lesson-row';
import { ChoiceStep, ReadStep } from '@/components/course/text-steps';
import { Icon } from '@/components/icon';
import { FadeIn } from '@/components/motion';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { StepDots } from '@/components/ui';
import { courseLessonById, courseLessons } from '@/content/course';
import { type CourseStep } from '@/content/types';
import { Spacing } from '@/constants/theme';
import { bestStars, starsForSlips } from '@/course/path';
import { useProgressStore } from '@/progress/store';

const PRAISE = { 3: 'Perfect!', 2: 'Well done!', 1: 'Lesson complete' } as const;

function StepView({
  step,
  onComplete,
  done,
  replay,
}: {
  step: CourseStep;
  onComplete: (slips: number, note?: string) => void;
  done: boolean;
  replay: number;
}) {
  switch (step.kind) {
    case 'read':
      return <ReadStep step={step} onComplete={onComplete} done={done} />;
    case 'choice':
      return <ChoiceStep step={step} onComplete={onComplete} done={done} />;
    case 'stars':
      return <StarsStep step={step} onComplete={onComplete} done={done} />;
    case 'capture':
      return <CaptureStep step={step} onComplete={onComplete} done={done} />;
    case 'tap':
      return <TapStep step={step} onComplete={onComplete} done={done} />;
    case 'move':
      return <MoveStep step={step} onComplete={onComplete} done={done} />;
    case 'play':
      return <PlayStep step={step} onComplete={onComplete} done={done} />;
    case 'puzzles':
      return <PuzzlesStep step={step} onComplete={onComplete} done={done} replay={replay} />;
  }
}

export default function CourseLessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = courseLessonById[id];
  const current = useProgressStore((state) => state.courseProgress.current);
  const results = useProgressStore((state) => state.courseProgress.results);
  const finishStep = useProgressStore((state) => state.finishCourseStep);
  const closeCourse = useProgressStore((state) => state.closeCourse);
  const startCourse = useProgressStore((state) => state.startCourse);
  const leaveCourse = useProgressStore((state) => state.leaveCourse);
  // Leaving part-way starts the lesson over from step 1 next time.
  useEffect(() => leaveCourse, [leaveCourse]);
  const [solved, setSolved] = useState<{ step: number; slips: number; note?: string } | null>(null);
  const run = current?.lessonId === id ? current : null;

  if (!entry || !run)
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Learn' }} />
        <ThemedText type="title" accessibilityRole="header">
          This lesson isn&apos;t open yet
        </ThemedText>
        <Button label="Back to Learn" onPress={() => router.replace('/learn')} />
      </Screen>
    );

  const { lesson } = entry;
  const total = lesson.steps.length;

  function leave() {
    closeCourse();
    if (router.canGoBack()) router.back();
    else router.replace('/learn');
  }

  if (run.step >= total) {
    const stars = starsForSlips(run.slips);
    const next = courseLessons[entry.index + 1];
    const nextOpen = next && bestStars(results)[lesson.id];
    return (
      <Screen
        footer={
          <>
            {nextOpen && (
              <Button
                icon="arrow-right"
                label="Next lesson"
                onPress={() => {
                  closeCourse();
                  if (startCourse(next.lesson.id))
                    router.replace({ pathname: '/course/[id]', params: { id: next.lesson.id } });
                }}
              />
            )}
            <Button variant={nextOpen ? 'secondary' : 'primary'} label="Done" onPress={leave} />
          </>
        }>
        <Stack.Screen options={{ title: '' }} />
        <View style={styles.summary}>
          <StarRow stars={stars} size={44} pop />
          <FadeIn delay={360} style={styles.summaryText}>
            <ThemedText type="display" accessibilityRole="header" style={styles.centered}>
              {PRAISE[stars]}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.centered}>
              {lesson.title}
            </ThemedText>
            {stars < 3 && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
                Play it again without mistakes for three stars.
              </ThemedText>
            )}
          </FadeIn>
        </View>
        {next && (
          <FadeIn delay={480}>
            <Card variant="muted">
              <ThemedText type="label" themeColor="textSecondary">
                Up next
              </ThemedText>
              <ThemedText type="subtitle">{next.lesson.title}</ThemedText>
            </Card>
          </FadeIn>
        )}
      </Screen>
    );
  }

  const step = lesson.steps[run.step];
  const done = step.kind === 'read' || solved?.step === run.step;
  const replay = results.filter((result) => result.lessonId === lesson.id).length;
  return (
    <Screen
      footer={
        done ? (
          <>
            {solved?.note && solved.step === run.step && (
              <FadeIn key={run.step} style={styles.note}>
                <Icon name="check" size={20} color="success" strokeWidth={2.6} />
                <ThemedText type="smallBold" themeColor="success" style={styles.noteText}>
                  {solved.note}
                </ThemedText>
              </FadeIn>
            )}
            <Button
              label={run.step === total - 1 ? 'Finish' : 'Continue'}
              onPress={() => {
                finishStep(solved?.step === run.step ? solved.slips : 0);
                setSolved(null);
              }}
            />
          </>
        ) : undefined
      }>
      <Stack.Screen options={{ title: lesson.title }} />
      <View style={styles.progress}>
        <ThemedText type="label" themeColor="accent">
          {entry.unit.title}
        </ThemedText>
        <View accessible accessibilityLabel={`Step ${run.step + 1} of ${total}`}>
          <StepDots
            steps={lesson.steps.map((_, index) => ({ done: index <= run.step, available: true }))}
          />
        </View>
      </View>
      <FadeIn key={`${lesson.id}-${run.step}`}>
        <StepView
          step={step}
          done={done}
          replay={replay}
          onComplete={(slips, note) => setSolved({ step: run.step, slips, note })}
        />
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { gap: Spacing.two },
  note: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  noteText: { flex: 1 },
  summary: { alignItems: 'center', gap: Spacing.three, paddingTop: Spacing.six },
  summaryText: { gap: Spacing.three },
  centered: { textAlign: 'center' },
});
