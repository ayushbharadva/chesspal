import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useProgressStore } from '@/progress/store';
import { activityStreak, dateKey } from '@/utils/date-key';

export function ActivityBar() {
  const theme = useTheme();
  const completions = useProgressStore((state) => state.completions);
  const dates = completions.map((completion) => completion.dateKey);
  const streak = activityStreak(dates, dateKey());
  return (
    <View style={styles.row}>
      <ThemedText type="smallBold">
        {streak
          ? `${streak} day${streak === 1 ? '' : 's'} of practice`
          : 'A little practice goes a long way'}
      </ThemedText>
      <View style={styles.days}>
        {Array.from({ length: 7 }, (_, index) => {
          const day = new Date();
          day.setDate(day.getDate() - 6 + index);
          const key = dateKey(day);
          const active = dates.includes(key);
          return (
            <View
              key={key}
              accessibilityLabel={`${key}: ${active ? 'practiced' : 'no workout'}`}
              style={[styles.dot, { backgroundColor: active ? theme.primary : theme.border }]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.two },
  days: { flexDirection: 'row', gap: Spacing.two },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
