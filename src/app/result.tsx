import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ActivityBar } from '@/components/activity-bar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { IconBadge, Pill, ProgressBar } from '@/components/ui';
import { Spacing } from '@/constants/theme';
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
  const assisted = session.results.length - independent;
  return (
    <Screen>
      <Card variant="hero">
        <IconBadge name="trophy" tone="hero" size={52} />
        <View style={styles.heroText}>
          <Pill tone="onHero" label="Practice complete" />
          <ThemedText type="title" themeColor="onHero" accessibilityRole="header">
            Another good rep.
          </ThemedText>
        </View>
        <View style={styles.score}>
          <ThemedText type="stat" themeColor="heroAccent">
            {independent} / {session.results.length}
          </ThemedText>
          <ThemedText themeColor="onHeroSecondary">solved independently</ThemedText>
        </View>
        <ProgressBar
          value={independent / session.results.length}
          track="heroOverlay"
          fill="heroAccent"
        />
        <ThemedText type="small" themeColor="onHeroSecondary">
          {assisted} completed with help or a retry. Every explanation is a chance to learn.
        </ThemedText>
      </Card>
      <Card>
        <ActivityBar />
      </Card>
      <Button
        icon="play"
        label="Keep practicing"
        onPress={() => {
          if (start('extra')) router.replace('/workout');
        }}
      />
      <Button
        variant="secondary"
        icon="book-open"
        label="Explore guides"
        onPress={() => router.replace('/learn')}
      />
      <Button variant="ghost" label="Done" onPress={() => router.dismissTo('/')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroText: { gap: Spacing.two },
  score: { gap: Spacing.half },
});
