import { router } from 'expo-router';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';

export default function ResultScreen() {
  return (
    <Screen>
      <ThemedText type="title" accessibilityRole="header">
        Workout complete!
      </ThemedText>
      <ThemedText themeColor="textSecondary">
        Your score and streak will show here in Milestone 7.
      </ThemedText>
      <Button label="Done" onPress={() => router.dismissTo('/')} />
    </Screen>
  );
}
