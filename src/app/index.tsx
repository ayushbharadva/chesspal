import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { getGreeting } from '@/utils/greeting';

export default function HomeScreen() {
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <ThemedText type="subtitle">{getGreeting(new Date().getHours())} 👋</ThemedText>

      <ThemedView type="surface" style={styles.workoutCard}>
        <ThemedText type="title" accessibilityRole="header">
          Today’s Chess Workout
        </ThemedText>
        <ThemedText themeColor="textSecondary">3 challenges · about 5 minutes</ThemedText>
        <Button label="Start Workout" onPress={() => router.push('/workout')} />
      </ThemedView>

      <ThemedText type="smallBold" themeColor="streak">
        🔥 Start your streak today
      </ThemedText>

      <Button variant="secondary" label="Your progress" onPress={() => router.push('/progress')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  workoutCard: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.large,
  },
});
