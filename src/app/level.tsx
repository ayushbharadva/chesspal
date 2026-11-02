import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LevelPicker } from '@/components/level-picker';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { type PuzzleLevel } from '@/content/types';
import { Spacing } from '@/constants/theme';
import { useProgressStore } from '@/progress/store';

export default function LevelScreen() {
  const { then } = useLocalSearchParams<{ then?: string }>();
  const current = useProgressStore((state) => state.level);
  const setLevel = useProgressStore((state) => state.setLevel);
  const startPractice = useProgressStore((state) => state.startPractice);
  const startRoute = useProgressStore((state) => state.startRoute);
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
        <ThemedText themeColor="textSecondary">You can change this any time.</ThemedText>
      </View>
      <LevelPicker current={current} onChoose={choose} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: Spacing.two, paddingTop: Spacing.two, paddingBottom: Spacing.two },
});
