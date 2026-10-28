import { router } from 'expo-router';
import { ActivityBar } from '@/components/activity-bar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useProgressStore } from '@/progress/store';

export default function ResultScreen() {
  const session = useProgressStore((state) => state.currentSession);
  const start = useProgressStore((state) => state.startPractice);
  if (session?.phase !== 'complete')
    return (
      <Screen>
        <ThemedText>Your results will appear after a workout.</ThemedText>
        <Button label="Go home" onPress={() => router.dismissTo('/')} />
      </Screen>
    );
  const independent = session.results.filter((result) => result.independent).length;
  return (
    <Screen>
      <ThemedText type="smallBold" themeColor="primary">
        PRACTICE COMPLETE
      </ThemedText>
      <ThemedText type="title" accessibilityRole="header">
        Another good rep.
      </ThemedText>
      <Card accent>
        <ThemedText type="title">
          {independent} / {session.results.length}
        </ThemedText>
        <ThemedText>solved independently</ThemedText>
        <ThemedText themeColor="textSecondary">
          {session.results.length - independent} completed with help or a retry. Every explanation
          is a chance to learn.
        </ThemedText>
      </Card>
      <ActivityBar />
      <Button
        label="Keep practicing"
        onPress={() => {
          if (start('extra')) router.replace('/workout');
        }}
      />
      <Button variant="secondary" label="Explore guides" onPress={() => router.replace('/learn')} />
      <Button variant="secondary" label="Done" onPress={() => router.dismissTo('/')} />
    </Screen>
  );
}
