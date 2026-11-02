import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ListRow, SectionTitle, StepDots, TextLink } from '@/components/ui';
import { puzzleById } from '@/content';
import { levelName } from '@/content/levels';
import { skillById, skillUnits } from '@/content/skills';
import { type SkillTheme } from '@/content/types';
import { Spacing } from '@/constants/theme';
import { routeTheme } from '@/daily-route/route';
import { useLocalDate } from '@/hooks/use-local-date';
import { useProgressStore } from '@/progress/store';
import {
  availableRungs,
  RUNGS,
  skillMastered,
  type Rung,
  type SkillProgress,
} from '@/skills/ladder';
import { strengthsAndWeaknesses } from '@/skills/themes';
import { bestScore } from '@/vision/coordinates';
import { reviewQueue } from '@/workout/review';

export default function PuzzlesScreen() {
  const today = useLocalDate();
  const level = useProgressStore((state) => state.level) ?? 1;
  const progress = useProgressStore((state) => state.skillProgress[level]);
  const attempts = useProgressStore((state) => state.attempts);
  const session = useProgressStore((state) => state.currentSession);
  const visionScores = useProgressStore((state) => state.visionScores);
  const routeRuns = useProgressStore((state) => state.routeRuns);
  const start = useProgressStore((state) => state.startPractice);
  const weak = useMemo(
    () => new Set(strengthsAndWeaknesses(attempts, puzzleById).weak.map((stats) => stats.theme)),
    [attempts],
  );
  const available = useMemo(
    () =>
      Object.fromEntries(
        skillUnits
          .flatMap((unit) => unit.skills)
          .map((theme) => [theme, availableRungs(theme, level)]),
      ) as Record<SkillTheme, Rung[]>,
    [level],
  );
  const unfinished = session && session.phase !== 'complete';
  const reviews = reviewQueue(attempts, today).length;
  const routeToday = routeRuns.find((run) => run.dateKey === today);
  const bestVision = bestScore(visionScores);
  function openPractice(review = false) {
    if (start(review ? 'review' : 'daily')) router.push('/workout');
  }
  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={styles.intro}>
        <ThemedText type="title" accessibilityRole="header">
          Puzzles
        </ThemedText>
        <View style={styles.level}>
          <ThemedText themeColor="textSecondary">Level: {levelName(level)}</ThemedText>
          <TextLink label="Change" onPress={() => router.push('/level')} />
        </View>
      </View>
      <ListRow
        icon="play"
        title={unfinished ? 'Resume puzzles' : 'Mixed puzzles'}
        detail={
          unfinished
            ? `${session.results.length} of ${session.puzzleIds.length} done`
            : '10 puzzles from every theme'
        }
        onPress={() => openPractice()}
      />
      {!unfinished && reviews > 0 && (
        <ListRow
          icon="rotate-ccw"
          title={`Review ${reviews} puzzle${reviews === 1 ? '' : 's'}`}
          detail="Replay earlier puzzles so they stick"
          onPress={() => openPractice(true)}
        />
      )}
      <ListRow
        icon="mountain"
        title="Daily challenge"
        detail={
          routeToday
            ? `${routeToday.score} points today`
            : `${skillById[routeTheme(today)].name} · new every day`
        }
        onPress={() => router.push('/daily-route')}
      />
      <ThemedText type="small" themeColor="textSecondary" style={styles.themesNote}>
        Learn one theme at a time. Each has 3 short rounds; the dots show the ones you passed at
        this level.
      </ThemedText>
      {skillUnits.map((unit) => (
        <View key={unit.id} style={styles.unit}>
          <SectionTitle>{unit.title}</SectionTitle>
          {unit.skills.map((theme) => (
            <ListRow
              key={theme}
              icon={skillMastered(progress?.[theme], available[theme]) ? 'check' : 'puzzle'}
              title={skillById[theme].name}
              detail={
                weak.has(theme)
                  ? `Needs practice · ${skillById[theme].summary}`
                  : skillById[theme].summary
              }
              accessibilityLabel={`${skillById[theme].name}: ${describeProgress(progress?.[theme], available[theme])}`}
              trailing={
                <StepDots
                  steps={RUNGS.map((rung) => ({
                    done: progress?.[theme]?.cleared.includes(rung) ?? false,
                    available: available[theme].includes(rung),
                  }))}
                />
              }
              onPress={() => router.push({ pathname: '/skill/[id]', params: { id: theme } })}
            />
          ))}
        </View>
      ))}
      <SectionTitle>Board skills</SectionTitle>
      <ListRow
        icon="eye"
        title="Square trainer"
        detail={bestVision === null ? 'Learn every square by name' : `Best: ${bestVision} squares`}
        onPress={() => router.push('/vision')}
      />
    </Screen>
  );
}

function describeProgress(progress: SkillProgress | undefined, available: readonly Rung[]) {
  if (skillMastered(progress, available)) return 'mastered';
  const cleared = progress?.cleared.length ?? 0;
  return `${cleared} of ${available.length} rounds passed`;
}

const styles = StyleSheet.create({
  intro: { gap: Spacing.one, paddingTop: Spacing.two },
  level: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  themesNote: { paddingTop: Spacing.two },
  unit: { gap: Spacing.three },
});
