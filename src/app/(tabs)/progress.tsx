import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActivityBar } from '@/components/activity-bar';
import { Card } from '@/components/card';
import { type IconName } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { IconBadge, ListRow, Pill, ProgressBar, SectionTitle } from '@/components/ui';
import { guides, puzzleById } from '@/content';
import { levelName } from '@/content/levels';
import { skillById, skillUnits } from '@/content/skills';
import { bestRun } from '@/daily-route/route';
import { SHOW_OPENINGS } from '@/constants/features';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { courseLessons } from '@/content/course';
import { bestStars, starTotals } from '@/course/path';
import { practiceDates } from '@/progress/activity';
import { useProgressStore } from '@/progress/store';
import { availableRungs, skillMastered } from '@/skills/ladder';
import { strengthsAndWeaknesses, themeStats } from '@/skills/themes';
import { activityStreak, bestActivityStreak } from '@/utils/date-key';
import { bestScore } from '@/vision/coordinates';
import { useLocalDate } from '@/hooks/use-local-date';

export default function ProgressScreen() {
  const today = useLocalDate();
  const attempts = useProgressStore((state) => state.attempts);
  const completions = useProgressStore((state) => state.completions);
  const guideProgress = useProgressStore((state) => state.guideProgress);
  const learning = useProgressStore((state) => state.lessonProgress.attempts);
  const courseResults = useProgressStore((state) => state.courseProgress.results);
  const courseTotals = starTotals(
    courseLessons.map((entry) => entry.lesson.id),
    bestStars(courseResults),
  );
  const independent = attempts.filter((attempt) => attempt.independent).length;
  const learned = guides.filter((guide) => guideProgress[guide.id]?.completedAt).length;
  const days = practiceDates(completions, learning, courseResults);
  const currentStreak = activityStreak(days, today);
  const bestStreak = bestActivityStreak(days);
  const dayCount = (count: number) => `${count} ${count === 1 ? 'day' : 'days'}`;
  const level = useProgressStore((state) => state.level);
  const skillProgress = useProgressStore((state) => state.skillProgress);
  const visionScores = useProgressStore((state) => state.visionScores);
  const themes = useMemo(() => {
    const { byTheme } = themeStats(attempts, puzzleById);
    const { strong, weak } = strengthsAndWeaknesses(attempts, puzzleById);
    return byTheme
      .map((stats) => ({
        ...stats,
        verdict: strong.some((item) => item.theme === stats.theme)
          ? ('strong' as const)
          : weak.some((item) => item.theme === stats.theme)
            ? ('weak' as const)
            : null,
      }))
      .sort((first, second) => second.attempts - first.attempts);
  }, [attempts]);
  const allSkills = skillUnits.flatMap((unit) => unit.skills);
  const mastered = allSkills.filter((theme) =>
    skillMastered(skillProgress[level ?? 1]?.[theme], availableRungs(theme, level ?? 1)),
  ).length;
  const bestVision = bestScore(visionScores);
  const routeRuns = useProgressStore((state) => state.routeRuns);
  const routeBest = bestRun(routeRuns);
  const fromMemory = learning.filter(
    (attempt) => attempt.kind === 'branch' && attempt.independent,
  ).length;
  const newPositions = learning.filter(
    (attempt) => attempt.kind === 'transfer' && attempt.independent,
  ).length;
  return (
    <Screen edges={['top', 'left', 'right']}>
      <ThemedText type="title" accessibilityRole="header" style={styles.intro}>
        Progress
      </ThemedText>

      <View style={styles.tiles}>
        <StatTile icon="flame" label="Current streak" value={dayCount(currentStreak)} highlight />
        <StatTile icon="trophy" label="Best streak" value={dayCount(bestStreak)} />
      </View>
      <Card>
        <ActivityBar />
      </Card>

      <SectionTitle>Learn</SectionTitle>
      <Card>
        <View style={styles.list}>
          <Stat
            label="Lessons finished"
            value={`${courseTotals.finished} / ${courseLessons.length}`}
          />
          <Stat
            label="Stars earned"
            value={`${courseTotals.stars} / ${courseLessons.length * 3}`}
            last
          />
        </View>
      </Card>

      <SectionTitle>Puzzles</SectionTitle>
      <Card>
        <View style={styles.headlineStat}>
          <ThemedText type="stat">
            {attempts.length ? `${Math.round((independent / attempts.length) * 100)}%` : '–'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {attempts.length ? 'solved without help' : 'No puzzles yet'}
          </ThemedText>
        </View>
        <View style={styles.list}>
          <Stat label="Puzzles played" value={String(attempts.length)} />
          <Stat label="Solved without help" value={String(independent)} />
          <Stat label="Solved with help" value={String(attempts.length - independent)} last />
        </View>
      </Card>

      <SectionTitle>Themes</SectionTitle>
      <Card>
        {themes.length ? (
          themes.map((stats) => (
            <ThemeRow
              key={stats.theme}
              name={skillById[stats.theme].name}
              attempts={stats.attempts}
              independent={stats.independent}
              verdict={stats.verdict}
            />
          ))
        ) : (
          <ThemedText themeColor="textSecondary">
            Play a few puzzles to see your strong and weak themes.
          </ThemedText>
        )}
      </Card>

      {SHOW_OPENINGS && (
        <>
          <SectionTitle>Openings</SectionTitle>
          <Card>
            <View style={styles.list}>
              <Stat label="Guides practiced" value={`${learned} / ${guides.length}`} />
              <Stat label="Lines played from memory" value={String(fromMemory)} />
              <Stat label="New positions solved" value={String(newPositions)} last />
            </View>
          </Card>
        </>
      )}

      <SectionTitle>More</SectionTitle>
      <Card>
        <View style={styles.list}>
          <Stat
            label="Daily challenge best"
            value={routeBest === null ? '–' : `${routeBest} points`}
          />
          <Stat
            label={`Skills mastered at ${levelName(level)}`}
            value={`${mastered} / ${allSkills.length}`}
          />
          <Stat
            label="Square trainer best"
            value={bestVision === null ? '–' : `${bestVision} squares`}
          />
          <Stat label="Puzzle level" value={levelName(level)} last />
        </View>
      </Card>
      <ListRow icon="settings" title="Settings" onPress={() => router.push('/settings')} />
    </Screen>
  );
}

function ThemeRow({
  name,
  attempts,
  independent,
  verdict,
}: {
  name: string;
  attempts: number;
  independent: number;
  verdict: 'strong' | 'weak' | null;
}) {
  const percent = Math.round((independent / attempts) * 100);
  return (
    <View
      style={styles.theme}
      accessible
      accessibilityLabel={`${name}: ${percent}% solved without help in ${attempts} ${attempts === 1 ? 'puzzle' : 'puzzles'}${verdict === 'strong' ? ', a strength' : verdict === 'weak' ? ', needs practice' : ''}`}>
      <View style={styles.themeHeader}>
        <ThemedText type="smallBold" style={styles.label}>
          {name}
        </ThemedText>
        {verdict && (
          <Pill
            label={verdict === 'strong' ? 'Strong' : 'Needs practice'}
            tone={verdict === 'strong' ? 'success' : 'accent'}
          />
        )}
        <ThemedText type="small" themeColor="textSecondary">
          {percent}% · {attempts}
        </ThemedText>
      </View>
      <ProgressBar
        value={independent / attempts}
        fill={verdict === 'weak' ? 'accent' : 'accentFill'}
      />
    </View>
  );
}

function StatTile({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: IconName;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: highlight ? theme.accentSurface : theme.surface,
          borderColor: highlight ? theme.accentSurface : theme.border,
        },
      ]}
      accessible
      accessibilityLabel={`${label}: ${value}`}>
      <IconBadge name={icon} tone={highlight ? 'accent' : 'muted'} size={36} solid={highlight} />
      <ThemedText type="headline">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function Stat({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.row,
        !last && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
      accessible
      accessibilityLabel={`${label}: ${value}`}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
        {label}
      </ThemedText>
      <ThemedText type="subtitle">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { gap: Spacing.two, paddingTop: Spacing.two },
  tiles: { flexDirection: 'row', gap: Spacing.three },
  tile: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  headlineStat: { gap: Spacing.half },
  list: { marginTop: -Spacing.two },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  label: { flex: 1 },
  theme: { gap: Spacing.two },
  themeHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
