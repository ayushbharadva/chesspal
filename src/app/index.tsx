import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActivityBar } from '@/components/activity-bar';
import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon, type IconName } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { RoutePath } from '@/components/route-path';
import {
  IconBadge,
  ListRow,
  Pill,
  ProgressBar,
  SectionTitle,
  StepDots,
  TextLink,
} from '@/components/ui';
import { guides, puzzleById, puzzles } from '@/content';
import { levelName } from '@/content/levels';
import { skillById, skillUnits } from '@/content/skills';
import { Spacing } from '@/constants/theme';
import { routeSteps, routeTheme } from '@/daily-route/route';
import { lessonTarget } from '@/learning/lesson';
import { nextLesson } from '@/learning/next-lesson';
import { practiceDates } from '@/progress/activity';
import { useProgressStore } from '@/progress/store';
import { useLocalDate } from '@/hooks/use-local-date';
import { availableRungs, RUNGS, skillMastered } from '@/skills/ladder';
import { strengthsAndWeaknesses } from '@/skills/themes';
import { activityStreak } from '@/utils/date-key';
import { bestScore } from '@/vision/coordinates';
import { getGreeting } from '@/utils/greeting';
import { reviewQueue } from '@/workout/review';

const LESSON_REASONS = {
  resume: {
    label: 'Continue',
    text: 'Continue your saved lesson. Your earlier hints and retries stay recorded.',
    action: 'Resume lesson',
  },
  review: {
    label: 'Ready to recall',
    text: 'This lesson is ready for a later recall check. Try it without help.',
    action: 'Recall this lesson',
  },
  apply: {
    label: 'Apply the idea',
    text: 'You practiced an opening line. Try using its idea in an unfamiliar position.',
    action: 'Apply this idea',
  },
  learn: {
    label: 'New line',
    text: 'Follow the demonstration, then play the example with guidance.',
    action: 'Learn this line',
  },
} as const;

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
  const level = useProgressStore((state) => state.level);
  const skillProgress = useProgressStore((state) => state.skillProgress);
  const visionScores = useProgressStore((state) => state.visionScores);
  const routeRuns = useProgressStore((state) => state.routeRuns);
  const nextSkill = useMemo(() => {
    const weakest = strengthsAndWeaknesses(attempts, puzzleById).weak[0]?.theme;
    if (weakest) return { theme: weakest, weak: true };
    const unmastered = skillUnits
      .flatMap((unit) => unit.skills)
      .find((theme) => !skillMastered(skillProgress[theme], availableRungs(theme, level ?? 1)));
    return unmastered ? { theme: unmastered, weak: false } : null;
  }, [attempts, skillProgress, level]);
  const bestVision = bestScore(visionScores);
  const unfinished = session && session.phase !== 'complete';
  const doneToday = completions.some(
    (completion) => completion.dateKey === today && completion.mode !== 'route',
  );
  const routeToday = routeRuns.find((run) => run.dateKey === today);
  const routeActive = session?.mode === 'route' && session.phase !== 'complete' ? session : null;
  const reviews = reviewQueue(attempts, today).length;
  const learned = guides.filter((guide) => lessonProgress[guide.id]?.completedAt).length;
  const streak = activityStreak(practiceDates(completions, lessons.attempts), today);
  const step = nextLesson(lessons, today);
  const target = step ? lessonTarget(step.guideId, step.kind, step.targetId) : undefined;
  const reason = step ? LESSON_REASONS[step.reason] : undefined;
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
    <Screen edges={['top', 'bottom', 'left', 'right']}>
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
      <View style={styles.greeting}>
        <ThemedText type="display" accessibilityRole="header">
          {getGreeting(new Date().getHours())}.
        </ThemedText>
        <ThemedText themeColor="textSecondary">A few minutes a day. Sharper chess.</ThemedText>
      </View>

      <Card variant="hero">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Change level, currently ${levelName(level)}`}
          onPress={() => router.push('/level')}
          style={styles.levelPill}>
          <Pill tone="onHero" icon="puzzle" label={`Practice · ${levelName(level)}`} />
          <Icon name="chevron-right" size={16} color="onHeroSecondary" />
        </Pressable>
        <View style={styles.heroText}>
          <ThemedText type="title" themeColor="onHero">
            {unfinished
              ? 'Pick up where you left off'
              : doneToday
                ? 'Ready for another round?'
                : 'Your next 10 puzzles'}
          </ThemedText>
          <ThemedText themeColor="onHeroSecondary">
            {unfinished
              ? `${session.results.length} of ${session.puzzleIds.length} puzzles completed. Your place is saved.`
              : 'Spot a mate, win a piece, find a fork.'}
          </ThemedText>
        </View>
        {unfinished ? (
          <ProgressBar
            value={session.results.length / session.puzzleIds.length}
            track="heroOverlay"
            fill="heroAccent"
          />
        ) : (
          <View style={styles.meta}>
            <HeroMeta icon="lightbulb" label="Hints anytime" />
            <HeroMeta icon="check" label="Saves as you go" />
          </View>
        )}
        <Button
          variant="accent"
          icon={hydrated ? 'play' : undefined}
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
          <View style={[styles.heroText, styles.review]}>
            <ThemedText type="small" themeColor="onHeroSecondary">
              Puzzles ready for another try, including ones you solved without help.
            </ThemedText>
            <Button
              variant="onHero"
              icon="rotate-ccw"
              label={`Review ${reviews} puzzle${reviews === 1 ? '' : 's'}`}
              onPress={() => openPractice(true)}
            />
          </View>
        )}
      </Card>

      <SectionTitle>{`Daily route · ${skillById[routeTheme(today)].name}`}</SectionTitle>
      <Card>
        <View style={styles.learnHeader}>
          <IconBadge name="route" size={44} />
          <View style={styles.learnTitle}>
            <ThemedText type="headline">
              {routeToday
                ? `${routeToday.score} points today`
                : routeActive
                  ? 'Your route is waiting'
                  : 'Five squares, two forks'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {routeToday ? 'A new route opens tomorrow.' : 'Play it safe or take the steep path.'}
            </ThemedText>
          </View>
        </View>
        {routeActive && <RoutePath steps={routeSteps(routeActive)} />}
        <Button
          variant="secondary"
          disabled={!hydrated}
          label={
            routeToday ? "See today's route" : routeActive ? 'Resume route' : 'Open daily route'
          }
          onPress={() => router.push('/daily-route')}
        />
      </Card>

      {nextSkill && (
        <>
          <SectionTitle
            action={<TextLink label="All skills" onPress={() => router.push('/skills')} />}>
            Skills
          </SectionTitle>
          <ListRow
            icon="target"
            title={skillById[nextSkill.theme].name}
            detail={`${nextSkill.weak ? 'Worth practicing' : 'Next skill'} · ${skillById[nextSkill.theme].summary}`}
            accessibilityLabel={`Train ${skillById[nextSkill.theme].name.toLowerCase()}`}
            onPress={() =>
              router.push({ pathname: '/skill/[id]', params: { id: nextSkill.theme } })
            }
            trailing={
              <StepDots
                steps={RUNGS.map((rung) => ({
                  done: skillProgress[nextSkill.theme]?.cleared.includes(rung) ?? false,
                  available: true,
                }))}
              />
            }
          />
        </>
      )}

      <SectionTitle action={<TextLink label="All guides" onPress={() => router.push('/learn')} />}>
        Learn
      </SectionTitle>
      <Card>
        <View style={styles.learnHeader}>
          <IconBadge name="graduation-cap" size={44} />
          <View style={styles.learnTitle}>
            <ThemedText type="overline" themeColor="accent">
              {reason?.label ?? 'All examples tried'}
            </ThemedText>
            <ThemedText type="headline">
              {step
                ? guides.find((guide) => guide.id === step.guideId)!.title
                : 'Keep the ideas fresh'}
            </ThemedText>
          </View>
        </View>
        <ThemedText themeColor="textSecondary">
          {reason?.text ??
            'You have tried every example. Return for scheduled recall or explore a guide again.'}
        </ThemedText>
        {step && target && (
          <View style={styles.nextLine}>
            <Icon name="arrow-right" size={16} color="accent" />
            <ThemedText type="smallBold" style={styles.nextLineText}>
              {target.title}
            </ThemedText>
          </View>
        )}
        <View style={styles.guideProgress}>
          <ThemedText type="small" themeColor="textSecondary">
            {learned} of {guides.length} guides practiced
          </ThemedText>
          <ProgressBar value={learned / guides.length} />
        </View>
        {step && target && reason && (
          <Button
            variant="secondary"
            disabled={!hydrated}
            label={!hydrated ? 'Restoring your lessons…' : reason.action}
            onPress={openLesson}
          />
        )}
      </Card>

      <SectionTitle>This week</SectionTitle>
      <Card>
        <ActivityBar />
      </Card>

      <ListRow
        icon="eye"
        title="Board vision"
        detail={
          bestVision === null ? 'A 30-second square-finding drill' : `Best: ${bestVision} squares`
        }
        onPress={() => router.push('/vision')}
      />
      <ListRow
        icon="chart"
        title="Your progress"
        detail="Solves, recalls and streaks"
        onPress={() => router.push('/progress')}
      />
      <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
        {puzzles.length} puzzles · Works offline · No daily limit
      </ThemedText>
    </Screen>
  );
}

function HeroMeta({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.metaItem}>
      <Icon name={icon} size={16} color="heroAccent" />
      <ThemedText type="small" themeColor="onHeroSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
  },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.one },
  greeting: { gap: Spacing.one, paddingTop: Spacing.three, paddingBottom: Spacing.two },
  heroText: { gap: Spacing.two, paddingRight: Spacing.five },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two - Spacing.half },
  review: { paddingRight: 0, paddingTop: Spacing.one },
  learnHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  learnTitle: { flex: 1, gap: Spacing.half },
  nextLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  nextLineText: { flex: 1 },
  guideProgress: { gap: Spacing.two },
  footer: { textAlign: 'center', paddingTop: Spacing.two },
});
