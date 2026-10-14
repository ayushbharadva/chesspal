import { router } from 'expo-router';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { guides } from '@/content';
import { useProgressStore } from '@/progress/store';

export default function LearnScreen() {
  const progress = useProgressStore((state) => state.guideProgress);
  return (
    <Screen>
      <ThemedText type="title" accessibilityRole="header">
        Learn the ideas.
      </ThemedText>
      <ThemedText themeColor="textSecondary">
        Explore a short example line, understand the plan, then try the moves yourself.
      </ThemedText>
      {guides.map((guide) => (
        <Card key={guide.id}>
          <ThemedText type="smallBold" themeColor="primary">
            {guide.category.toUpperCase()} · PLAY AS {guide.side === 'w' ? 'WHITE' : 'BLACK'}
          </ThemedText>
          <ThemedText type="subtitle">{guide.title}</ThemedText>
          <ThemedText themeColor="textSecondary">{guide.description}</ThemedText>
          <ThemedText type="small">
            {guide.moves.length / 2} moves ·{' '}
            {progress[guide.id]?.completedAt
              ? 'Practiced'
              : progress[guide.id]?.viewedPly
                ? 'In progress'
                : 'Beginner guide'}
          </ThemedText>
          <Button
            variant="secondary"
            label={`Open ${guide.title}`}
            onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: guide.id } })}
          />
        </Card>
      ))}
      <ThemedText type="small" themeColor="textSecondary">
        Opponents can choose different replies. These examples teach plans rather than a forced
        script for every game.
      </ThemedText>
    </Screen>
  );
}
