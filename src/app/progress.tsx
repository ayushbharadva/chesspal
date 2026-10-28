import { StyleSheet, View } from 'react-native';
import { ActivityBar } from '@/components/activity-bar';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { guides, puzzles } from '@/content';
import { Spacing } from '@/constants/theme';
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
  return (
    <Screen>
      <ThemedText type="title" accessibilityRole="header">
        Your practice adds up.
      </ThemedText>
      <ThemedText themeColor="textSecondary">
        Independent solves and assisted practice are counted separately.
      </ThemedText>
      <Card>
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
        <Stat
          label="Unique puzzles practiced"
          value={`${new Set(attempts.map((attempt) => attempt.puzzleId)).size} / ${puzzles.length}`}
        />
        <Stat label="Workouts completed" value={String(completions.length)} />
        <Stat label="Guides practiced" value={`${learned} / ${guides.length}`} />
      </Card>
      <Card>
        <ThemedText type="subtitle">Learning practice</ThemedText>
        <Stat
          label="Opening lines recalled independently"
          value={String(
            learning.filter((attempt) => attempt.kind === 'branch' && attempt.independent).length,
          )}
        />
        <Stat
          label="New positions solved independently"
          value={String(
            learning.filter((attempt) => attempt.kind === 'transfer' && attempt.independent).length,
          )}
        />
        <Stat
          label="Learning completed with help or retries"
          value={String(learning.filter((attempt) => !attempt.independent).length)}
        />
      </Card>
      <Card>
        <ActivityBar />
        <Stat
          label="Current practice streak"
          value={`${currentStreak} ${currentStreak === 1 ? 'day' : 'days'}`}
        />
        <Stat
          label="Best practice streak"
          value={`${bestStreak} ${bestStreak === 1 ? 'day' : 'days'}`}
        />
      </Card>
      <ThemedText type="small" themeColor="textSecondary">
        Completed workouts, opening lines and new-position exercises count toward your practice
        streak. Progress is saved on this device. Practiced guides are a starting point, not a
        mastery score.
      </ThemedText>
    </Screen>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  label: { flex: 1 },
});
