import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLocalDate } from '@/hooks/use-local-date';
import { practiceDates } from '@/progress/activity';
import { useProgressStore } from '@/progress/store';
import { activityStreak, dateKey } from '@/utils/date-key';

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function ActivityBar() {
  const today = useLocalDate();
  const theme = useTheme();
  const completions = useProgressStore((state) => state.completions);
  const lessons = useProgressStore((state) => state.lessonProgress.attempts);
  const dates = practiceDates(completions, lessons);
  const streak = activityStreak(dates, today);
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="flame" size={18} color={streak ? 'streak' : 'textSecondary'} />
        <ThemedText type="smallBold">
          {streak
            ? `${streak} day${streak === 1 ? '' : 's'} of practice`
            : 'A little practice goes a long way'}
        </ThemedText>
      </View>
      <View style={styles.days}>
        {Array.from({ length: 7 }, (_, index) => {
          const day = new Date();
          day.setDate(day.getDate() - 6 + index);
          const key = dateKey(day);
          const active = dates.includes(key);
          const isToday = key === today;
          return (
            <View key={key} style={styles.day}>
              <ThemedText
                type="overline"
                themeColor={isToday ? 'text' : 'textSecondary'}
                accessibilityElementsHidden
                importantForAccessibility="no">
                {DAY_INITIALS[day.getDay()]}
              </ThemedText>
              <View
                accessibilityLabel={`${key}: ${active ? 'practiced' : 'no practice'}`}
                style={[
                  styles.dot,
                  active
                    ? { backgroundColor: theme.accentFill }
                    : { backgroundColor: theme.surfaceMuted },
                  isToday && !active && { borderColor: theme.accentFill, borderWidth: 1.5 },
                ]}>
                {active && <Icon name="check" size={14} color="onHeroAccent" strokeWidth={3} />}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: Spacing.two },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
