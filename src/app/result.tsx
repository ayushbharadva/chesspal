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
  const skillProgress = useProgressStore((state) => state.skillProgress);
  const routeRuns = useProgressStore((state) => state.routeRuns);
  const insight = useMemo(() => strengthsAndWeaknesses(attempts, puzzleById), [attempts]);
  if (session?.phase !== 'complete')
    return (
      <Screen>
        <ThemedText>Finish a round to see your results.</ThemedText>
        <Button label="Go home" onPress={() => router.dismissTo('/')} />
      </Screen>
    );
  const independent = session.results.filter((result) => result.independent).length;
  const skill = session.skill;
  const cleared = skill ? rungCleared(independent) : false;
  const available = skill ? availableRungs(skill.theme, skill.level) : [];
  const mastered = skill
    ? skillMastered(skillProgress[skill.level]?.[skill.theme], available)
    : false;
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
                  ? `Daily challenge · ${skillById[route.theme].name}`
                  : 'Round complete'
            }
          />
          <ThemedText type="title" themeColor="onHero" accessibilityRole="header">
            {skill
              ? mastered && cleared && skill.rung === 3
                ? `${skillById[skill.theme].name} mastered!`
                : cleared
                  ? 'Round passed!'
                  : 'Not passed yet'
              : route
                ? newBest
                  ? 'New best score!'
                  : par !== null && points > par
                    ? 'Better than usual!'
                    : 'Challenge done!'
                : independent === session.results.length
                  ? 'Perfect round!'
                  : 'Nice work!'}
          </ThemedText>
        </View>
        <View style={styles.score}>
          <ThemedText type="stat" themeColor="heroAccent">
            {route ? `${points} points` : `${independent} / ${session.results.length}`}
          </ThemedText>
          <ThemedText themeColor="onHeroSecondary">
            {route ? `out of ${ROUTE_MAX_SCORE}` : 'solved without help'}
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
        {(route ? par !== null : skill && !cleared) && (
          <ThemedText type="small" themeColor="onHeroSecondary">
            {route
              ? `Your usual score is ${par}.`
              : `Get ${RUNG_PASS} of ${session.results.length} with no hints or mistakes to pass. Next try has new puzzles.`}
          </ThemedText>
        )}
      </Card>
      {!skill && (insight.strong[0] || insight.weak[0]) && (
        <Card>
          {insight.strong[0] && (
            <Insight
              label="Your best theme"
              value={skillById[insight.strong[0].theme].name}
              tone="success"
            />
          )}
          {insight.weak[0] && (
            <Insight
              label="Needs practice"
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
            label="More puzzles"
            onPress={() => {
              if (start('extra')) router.replace('/workout');
            }}
          />
        </>
      )}
      <Button
        variant="ghost"
        label="Done"
        onPress={() => (router.canDismiss() ? router.dismissAll() : router.replace('/'))}
      />
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
        <ThemedText type="label" themeColor="textSecondary">
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
