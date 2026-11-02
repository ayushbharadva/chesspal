import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { LevelPicker } from '@/components/level-picker';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { type PuzzleLevel } from '@/content/types';
import { Spacing } from '@/constants/theme';
import { useProgressStore } from '@/progress/store';
import { type PracticeMode } from '@/progress/types';

/** What a level change does to a round already in progress. */
const IN_PROGRESS: Partial<Record<PracticeMode, string>> = {
  daily: "Puzzles you haven't started in your current round will switch too.",
  extra: "Puzzles you haven't started in your current round will switch too.",
  skill: 'Your skill round in progress stays at its level.',
  route: "Today's challenge in progress stays at its level.",
};

export default function LevelScreen() {
  const { then } = useLocalSearchParams<{ then?: string }>();
  const current = useProgressStore((state) => state.level);
  const setLevel = useProgressStore((state) => state.setLevel);
  const startPractice = useProgressStore((state) => state.startPractice);
  const startRoute = useProgressStore((state) => state.startRoute);
  const session = useProgressStore((state) => state.currentSession);
  const note = session && session.phase !== 'complete' ? IN_PROGRESS[session.mode] : undefined;
  function choose(level: PuzzleLevel) {
    setLevel(level);
    if (then === 'practice' && startPractice()) router.replace('/workout');
    else if (then === 'route' && startRoute()) router.replace('/workout');
    else router.back();
  }
  return (
    <Screen>
      <View style={styles.intro}>
        <ThemedText type="title" accessibilityRole="header">
          How well do you play?
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Rounds mix in a few easier and harder puzzles. You can change this any time.
        </ThemedText>
      </View>
      {note && (
        <Card variant="accent">
          <ThemedText type="small">{note}</ThemedText>
        </Card>
      )}
      <LevelPicker current={current} onChoose={choose} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: Spacing.two, paddingTop: Spacing.two, paddingBottom: Spacing.two },
});
