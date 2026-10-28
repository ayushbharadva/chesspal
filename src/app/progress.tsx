import { StyleSheet, View } from 'react-native';

import { ActivityBar } from '@/components/activity-bar';
import { Card } from '@/components/card';
import { type IconName } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { IconBadge, ProgressBar, SectionTitle } from '@/components/ui';
import { guides, puzzles } from '@/content';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { practiceDates } from '@/progress/activity';
import { useProgressStore } from '@/progress/store';
import { activityStreak, bestActivityStreak } from '@/utils/date-key';
import { useLocalDate } from '@/hooks/use-local-date';

export default function ProgressScreen() {
  const today = useLocalDate();
  const attempts = useProgressStore((state) => state.attempts);
  const completions = useProgressStore((state) => state.completions);
  const guideProgress = useProgressStore((state) => state.guideProgress);
  const learning = useProgressStore((state) => state.lessonProgress.attempts);
  const independent = attempts.filter((attempt) => attempt.independent).length;
  const learned = guides.filter((guide) => guideProgress[guide.id]?.completedAt).length;
  const days = practiceDates(completions, learning);
  const currentStreak = activityStreak(days, today);
  const bestStreak = bestActivityStreak(days);
  const uniquePuzzles = new Set(attempts.map((attempt) => attempt.puzzleId)).size;
  const dayCount = (count: number) => `${count} ${count === 1 ? 'day' : 'days'}`;
  return (
    <Screen>
      <View style={styles.intro}>
        <ThemedText type="title" accessibilityRole="header">
          Your practice adds up.
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Independent solves and assisted practice are counted separately.
        </ThemedText>
      </View>

      <View style={styles.tiles}>
        <StatTile
          icon="flame"
          label="Current practice streak"
          value={dayCount(currentStreak)}
          highlight
        />
        <StatTile icon="trophy" label="Best practice streak" value={dayCount(bestStreak)} />
      </View>
      <Card>
        <ActivityBar />
      </Card>

      <SectionTitle>Puzzles</SectionTitle>
      <Card>
        <View style={styles.headlineStat}>
          <ThemedText type="stat">
            {attempts.length ? `${Math.round((independent / attempts.length) * 100)}%` : '–'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {attempts.length ? 'independent solve rate' : 'No attempts yet'}
          </ThemedText>
        </View>
        <ProgressBar value={uniquePuzzles / puzzles.length} />
        <View style={styles.list}>
          <Stat label="Puzzles completed" value={String(attempts.length)} />
          <Stat label="Solved independently" value={String(independent)} />
          <Stat
            label="Completed with help or retries"
            value={String(attempts.length - independent)}
          />
          <Stat
            label="Independent solve rate"
            value={
              attempts.length
                ? `${Math.round((independent / attempts.length) * 100)}%`
                : 'No attempts yet'
            }
          />
          <Stat label="Unique puzzles practiced" value={`${uniquePuzzles} / ${puzzles.length}`} />
          <Stat label="Workouts completed" value={String(completions.length)} last />
        </View>
      </Card>

      <SectionTitle>Openings</SectionTitle>
      <Card>
        <View style={styles.list}>
          <Stat label="Guides practiced" value={`${learned} / ${guides.length}`} />
          <Stat
            label="Opening lines recalled independently"
            value={String(
              learning.filter((attempt) => attempt.kind === 'branch' && attempt.independent).length,
            )}
          />
          <Stat
            label="New positions solved independently"
            value={String(
              learning.filter((attempt) => attempt.kind === 'transfer' && attempt.independent)
                .length,
            )}
          />
          <Stat
            label="Learning completed with help or retries"
            value={String(learning.filter((attempt) => !attempt.independent).length)}
            last
          />
        </View>
      </Card>
      <ThemedText type="small" themeColor="textSecondary">
        Completed workouts, opening lines and new-position exercises count toward your practice
        streak. Progress is saved on this device. Practiced guides are a starting point, not a
        mastery score.
      </ThemedText>
    </Screen>
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
});
