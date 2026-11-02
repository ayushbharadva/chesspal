import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActivityBar } from '@/components/activity-bar';
import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ListRow, Pill, ProgressBar, SectionTitle } from '@/components/ui';
import { guides } from '@/content';
import { levelName } from '@/content/levels';
import { skillById } from '@/content/skills';
import { Spacing } from '@/constants/theme';
import { ROUTE_MAX_SCORE, routeTheme } from '@/daily-route/route';
import { lessonTarget } from '@/learning/lesson';
import { nextLesson } from '@/learning/next-lesson';
import { practiceDates } from '@/progress/activity';
import { useProgressStore } from '@/progress/store';
import { useLocalDate } from '@/hooks/use-local-date';
import { activityStreak } from '@/utils/date-key';
import { getGreeting } from '@/utils/greeting';
import { reviewQueue } from '@/workout/review';

/** What the next opening step asks of the player, as the row's detail and spoken label. */
const LESSON_STEPS = {
  resume: { detail: 'Continue where you left off', action: 'Resume lesson' },
  review: { detail: 'Play it again from memory', action: 'Review lesson' },
  apply: { detail: 'Try the idea in a new position', action: 'Try a new position' },
  learn: { detail: 'Watch the moves, then play them', action: 'Start lesson' },
} as const;

export default function HomeScreen() {
  const today = useLocalDate();
  const hydrated = useProgressStore((state) => state.hydrated);
  const session = useProgressStore((state) => state.currentSession);
  const attempts = useProgressStore((state) => state.attempts);
  const completions = useProgressStore((state) => state.completions);
  const lessons = useProgressStore((state) => state.lessonProgress);
  const selectLesson = useProgressStore((state) => state.selectLesson);
  const startLesson = useProgressStore((state) => state.startLesson);
  const start = useProgressStore((state) => state.startPractice);
  const level = useProgressStore((state) => state.level);
  const routeRuns = useProgressStore((state) => state.routeRuns);
  const unfinished = session && session.phase !== 'complete';
  const doneToday = completions.some(
    (completion) => completion.dateKey === today && completion.mode !== 'route',
  );
  const routeToday = routeRuns.find((run) => run.dateKey === today);
  const routeActive = session?.mode === 'route' && session.phase !== 'complete';
  const reviews = reviewQueue(attempts, today).length;
  const streak = activityStreak(practiceDates(completions, lessons.attempts), today);
  const step = nextLesson(lessons, today);
  const target = step ? lessonTarget(step.guideId, step.kind, step.targetId) : undefined;
  const lessonStep = step ? LESSON_STEPS[step.reason] : undefined;
  function openPractice(review = false) {
    if (!review && level === null && !unfinished) {
      router.push({ pathname: '/level', params: { then: 'practice' } });
      return;
    }
    if (start(review ? 'review' : 'daily')) router.push('/workout');
  }
  function openLesson() {
    if (!step || !hydrated) return;
    if (step.reason === 'learn') selectLesson(step.guideId, step.kind, step.targetId);
    else startLesson(step.guideId, step.kind, step.targetId, step.reason === 'review');
    router.push({ pathname: '/lesson/[id]', params: { id: step.guideId } });
  }
  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <BrandMark size={34} />
          <ThemedText type="headline">ChessPal</ThemedText>
        </View>
        <View style={styles.topActions}>
          <View
            accessible
            accessibilityLabel={`Practice streak: ${streak} ${streak === 1 ? 'day' : 'days'}`}>
            <Pill icon="flame" tone={streak ? 'accent' : 'muted'} label={String(streak)} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            hitSlop={Spacing.two}
            onPress={() => router.push('/settings')}>
            <Icon name="settings" size={22} color="textSecondary" />
          </Pressable>
        </View>
      </View>
      <ThemedText type="display" accessibilityRole="header" style={styles.greeting}>
        {getGreeting(new Date().getHours())}.
      </ThemedText>

      <Card variant="hero">
        <Pill tone="onHero" icon="puzzle" label={`Today's puzzles · ${levelName(level)}`} />
        <View style={styles.heroText}>
          <ThemedText type="title" themeColor="onHero">
            {unfinished
              ? 'Pick up where you left off'
              : doneToday
                ? 'Done for today!'
                : attempts.length
                  ? '10 puzzles for today'
                  : 'Your first puzzles'}
          </ThemedText>
          <ThemedText themeColor="onHeroSecondary">
            {unfinished
              ? `${session.results.length} of ${session.puzzleIds.length} done.`
              : doneToday
                ? 'Play more whenever you like.'
                : 'Find the best move in each one.'}
          </ThemedText>
        </View>
        {unfinished && (
          <ProgressBar
            value={session.results.length / session.puzzleIds.length}
            track="heroOverlay"
            fill="heroAccent"
          />
        )}
        <Button
          variant="accent"
          icon={hydrated ? 'play' : undefined}
          disabled={!hydrated}
          label={
            !hydrated
              ? 'Loading…'
              : unfinished
                ? 'Resume puzzles'
                : doneToday
                  ? 'Play more puzzles'
                  : 'Start puzzles'
          }
          onPress={() => openPractice()}
        />
      </Card>

      {!unfinished && reviews > 0 && (
        <ListRow
          icon="rotate-ccw"
          title={`Review ${reviews} puzzle${reviews === 1 ? '' : 's'}`}
          detail="Replay earlier puzzles so they stick"
          onPress={() => openPractice(true)}
        />
      )}

      <SectionTitle>Daily challenge</SectionTitle>
      <ListRow
        icon="mountain"
        title={routeToday ? `${routeToday.score} points today` : skillById[routeTheme(today)].name}
        detail={
          routeToday
            ? 'New challenge tomorrow'
            : routeActive
              ? 'In progress. Tap to continue.'
              : `5 puzzles · score up to ${ROUTE_MAX_SCORE}`
        }
        accessibilityLabel={
          routeToday
            ? "See today's challenge"
            : routeActive
              ? 'Resume daily challenge'
              : 'Open daily challenge'
        }
        onPress={() => router.push('/daily-route')}
      />

      {hydrated && (
        <>
          <SectionTitle>Openings</SectionTitle>
          {step && target && lessonStep ? (
            <ListRow
              icon="book-open"
              title={guides.find((guide) => guide.id === step.guideId)!.title}
              detail={lessonStep.detail}
              accessibilityLabel={lessonStep.action}
              onPress={openLesson}
            />
          ) : (
            <ListRow
              icon="book-open"
              title="All lessons tried"
              detail="Replay any opening to keep it fresh"
              onPress={() => router.navigate('/learn')}
            />
          )}
        </>
      )}

      <SectionTitle>This week</SectionTitle>
      <Card>
        <ActivityBar />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
  },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.one },
  greeting: { paddingTop: Spacing.two },
  heroText: { gap: Spacing.two, paddingRight: Spacing.five },
});
