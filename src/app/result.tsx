import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActivityBar } from '@/components/activity-bar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { IconBadge, Pill, ProgressBar } from '@/components/ui';
import { puzzleById } from '@/content';
import { skillById } from '@/content/skills';
import { RoutePath } from '@/components/route-path';
import { bestRun, ROUTE_MAX_SCORE, routePar, routeScore, routeSteps } from '@/daily-route/route';
import { Spacing } from '@/constants/theme';
import { useProgressStore } from '@/progress/store';
import {
  availableRungs,
  RUNG_NAMES,
  RUNG_PASS,
  rungCleared,
  skillMastered,
  type Rung,
} from '@/skills/ladder';
import { strengthsAndWeaknesses } from '@/skills/themes';

export default function ResultScreen() {
  const session = useProgressStore((state) => state.currentSession);
  const start = useProgressStore((state) => state.startPractice);
  const startSkill = useProgressStore((state) => state.startSkill);
  const attempts = useProgressStore((state) => state.attempts);
  const level = useProgressStore((state) => state.level) ?? 1;
  const skillProgress = useProgressStore((state) => state.skillProgress);
  const routeRuns = useProgressStore((state) => state.routeRuns);
  const insight = useMemo(() => strengthsAndWeaknesses(attempts, puzzleById), [attempts]);
  if (session?.phase !== 'complete')
    return (
      <Screen>
        <ThemedText>Your results will appear after a workout.</ThemedText>
        <Button label="Go home" onPress={() => router.dismissTo('/')} />
      </Screen>
    );
  const independent = session.results.filter((result) => result.independent).length;
  const assisted = session.results.length - independent;
  const skill = session.skill;
  const cleared = skill ? rungCleared(independent) : false;
  const available = skill ? availableRungs(skill.theme, level) : [];
  const mastered = skill ? skillMastered(skillProgress[skill.theme], available) : false;
  const nextRung = skill && cleared ? available.find((rung) => rung > skill.rung) : undefined;
  const route = session.route;
  const points = route ? routeScore(route.taken, session.results) : 0;
  const par = routePar(routeRuns, session.dateKey);
  const earlierBest = bestRun(routeRuns, session.dateKey);
  const newBest = route !== undefined && earlierBest !== null && points > earlierBest;
  function playSkill(rung: Rung) {
    if (skill && startSkill(skill.theme, rung)) router.replace('/workout');
  }
  return (
    <Screen>
      <Card variant="hero">
        <IconBadge name={skill && !cleared ? 'target' : 'trophy'} tone="hero" size={52} />
        <View style={styles.heroText}>
          <Pill
            tone="onHero"
            label={
              skill
                ? `${skillById[skill.theme].name} · ${RUNG_NAMES[skill.rung]}`
                : route
                  ? `Daily route · ${skillById[route.theme].name}`
                  : 'Practice complete'
            }
          />
          <ThemedText type="title" themeColor="onHero" accessibilityRole="header">
            {skill
              ? mastered && cleared && skill.rung === 3
                ? `${skillById[skill.theme].name} mastered.`
                : cleared
                  ? 'Round cleared.'
                  : 'Not cleared yet.'
              : route
                ? newBest
                  ? 'A new best route.'
                  : par !== null && points >= par
                    ? 'At or above your par.'
                    : 'Route complete.'
                : 'Another good rep.'}
          </ThemedText>
        </View>
        <View style={styles.score}>
          <ThemedText type="stat" themeColor="heroAccent">
            {route ? `${points} points` : `${independent} / ${session.results.length}`}
          </ThemedText>
          <ThemedText themeColor="onHeroSecondary">
            {route
              ? `out of ${ROUTE_MAX_SCORE} · ${independent} of ${session.results.length} solved independently`
              : 'solved independently'}
          </ThemedText>
        </View>
        {route ? (
          <RoutePath steps={routeSteps(session)} onHero />
        ) : (
          <ProgressBar
            value={independent / session.results.length}
            track="heroOverlay"
            fill="heroAccent"
          />
        )}
        <ThemedText type="small" themeColor="onHeroSecondary">
          {route
            ? par === null
              ? 'Finish three routes to set your par: the middle score of your earlier runs.'
              : `Your par is ${par}, the middle score of your earlier runs.`
            : skill && !cleared
              ? `Solve ${RUNG_PASS} of ${session.results.length} without hints or retries to clear this round. Your next try uses fresh puzzles.`
              : `${assisted} completed with help or a retry. Every explanation is a chance to learn.`}
        </ThemedText>
      </Card>
      {!skill && (insight.strong[0] || insight.weak[0]) && (
        <Card>
          {insight.strong[0] && (
            <Insight
              label="Your strongest area"
              value={skillById[insight.strong[0].theme].name}
              tone="success"
            />
          )}
          {insight.weak[0] && (
            <Insight
              label="Keep practicing"
              value={skillById[insight.weak[0].theme].name}
              tone="accent"
            />
          )}
          {insight.weak[0] && (
            <Button
              variant="secondary"
              icon="target"
              label={`Practice ${skillById[insight.weak[0].theme].name.toLowerCase()}`}
              onPress={() =>
                router.push({ pathname: '/skill/[id]', params: { id: insight.weak[0].theme } })
              }
            />
          )}
        </Card>
      )}
      <Card>
        <ActivityBar />
      </Card>
      {skill ? (
        <>
          {nextRung ? (
            <Button
              icon="arrow-right"
              label={`Next: ${RUNG_NAMES[nextRung].toLowerCase()}`}
              onPress={() => playSkill(nextRung)}
            />
          ) : (
            <Button
              icon="rotate-ccw"
              label={cleared ? 'Play again' : 'Try again'}
              onPress={() => playSkill(skill.rung)}
            />
          )}
          <Button
            variant="secondary"
            icon="book-open"
            label="Back to skill"
            onPress={() =>
              router.dismissTo({ pathname: '/skill/[id]', params: { id: skill.theme } })
            }
          />
        </>
      ) : (
        <>
          <Button
            icon="play"
            label="Keep practicing"
            onPress={() => {
              if (start('extra')) router.replace('/workout');
            }}
          />
          <Button
            variant="secondary"
            icon="book-open"
            label="Explore guides"
            onPress={() => router.replace('/learn')}
          />
        </>
      )}
      <Button variant="ghost" label="Done" onPress={() => router.dismissTo('/')} />
    </Screen>
  );
}

function Insight({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'success' | 'accent';
}) {
  return (
    <View style={styles.insight} accessible accessibilityLabel={`${label}: ${value}`}>
      <IconBadge name={tone === 'success' ? 'trophy' : 'target'} tone={tone} size={36} />
      <View style={styles.insightText}>
        <ThemedText type="overline" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText type="headline">{value}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroText: { gap: Spacing.two },
  score: { gap: Spacing.half },
  insight: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  insightText: { flex: 1, gap: Spacing.half },
});
