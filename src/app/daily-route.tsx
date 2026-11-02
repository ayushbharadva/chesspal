import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { RoutePath } from '@/components/route-path';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Bullet, Pill } from '@/components/ui';
import { levelName } from '@/content/levels';
import { skillById } from '@/content/skills';
import { Spacing } from '@/constants/theme';
import {
  bestRun,
  ROUTE_MAX_SCORE,
  routePar,
  routeSteps,
  routeTheme,
  SAFE_HELPED_POINTS,
  SAFE_POINTS,
  STEEP_POINTS,
} from '@/daily-route/route';
import { useLocalDate } from '@/hooks/use-local-date';
import { useProgressStore } from '@/progress/store';

export default function DailyRouteScreen() {
  const today = useLocalDate();
  const session = useProgressStore((state) => state.currentSession);
  const runs = useProgressStore((state) => state.routeRuns);
  const level = useProgressStore((state) => state.level);
  const startRoute = useProgressStore((state) => state.startRoute);
  const skill = skillById[routeTheme(today)];
  const run = runs.find((item) => item.dateKey === today);
  const unfinished = session && session.phase !== 'complete' ? session : null;
  const routeInProgress = unfinished?.mode === 'route' ? unfinished : null;
  const blocked = unfinished !== null && !routeInProgress;
  const shownSession =
    routeInProgress ??
    (session?.mode === 'route' && session.dateKey === today && run ? session : null);
  const par = routePar(runs, today);
  const best = bestRun(runs);
  const recent = runs
    .filter((item) => item.dateKey !== today)
    .slice(-5)
    .map((item) => item.score);
  function open() {
    if (level === null && !routeInProgress) {
      router.push({ pathname: '/level', params: { then: 'route' } });
      return;
    }
    if (startRoute()) router.push('/workout');
  }
  return (
    <Screen
      footer={
        run ? (
          <Button
            variant="secondary"
            label="Done"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
        ) : blocked ? (
          <Button label="Resume puzzles" onPress={() => router.push('/workout')} />
        ) : (
          <Button
            icon="play"
            label={routeInProgress ? 'Resume challenge' : 'Start challenge'}
            onPress={open}
          />
        )
      }>
      <View style={styles.intro}>
        <Pill icon="target" tone="accent" label={`${skill.name} · ${levelName(level)}`} />
        <ThemedText type="title" accessibilityRole="header">
          {run ? `${run.score} points today.` : "Today's challenge."}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {run
            ? `Out of ${ROUTE_MAX_SCORE}. A new challenge opens tomorrow.`
            : `5 puzzles. Twice, you pick normal or hard.`}
        </ThemedText>
      </View>
      <Card>
        <RoutePath steps={routeSteps(shownSession)} />
        <View style={styles.rules}>
          <Bullet>{`Normal: ${SAFE_POINTS} points, or ${SAFE_HELPED_POINTS} with help.`}</Bullet>
          <Bullet>{`Hard: ${STEEP_POINTS} points, or 0 with help.`}</Bullet>
          <Bullet>One try a day.</Bullet>
        </View>
      </Card>
      {blocked && (
        <Card variant="accent">
          <ThemedText>Finish your current puzzles first.</ThemedText>
        </Card>
      )}
      <Card>
        <ThemedText type="overline" themeColor="textSecondary">
          Your record
        </ThemedText>
        <View style={styles.stats}>
          <Stat label="Usual" value={par === null ? '–' : String(par)} />
          <Stat label="Best" value={best === null ? '–' : String(best)} />
          <Stat label="Played" value={String(runs.length)} />
        </View>
        {recent.length > 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            Recent: {recent.join(', ')}
          </ThemedText>
        )}
      </Card>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <ThemedText type="stat">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { gap: Spacing.two, paddingTop: Spacing.two },
  rules: { gap: Spacing.two },
  stats: { flexDirection: 'row', gap: Spacing.three },
  stat: { flex: 1, gap: Spacing.half },
});
