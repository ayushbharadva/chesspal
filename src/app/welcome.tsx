import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { type IconName } from '@/components/icon';
import { LevelPicker } from '@/components/level-picker';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { WelcomeScene } from '@/components/illustrations';
import { IconBadge, ListRow } from '@/components/ui';
import { courseLessons } from '@/content/course';
import { type PuzzleLevel } from '@/content/types';
import { Spacing } from '@/constants/theme';
import { useProgressStore } from '@/progress/store';

const FEATURES: readonly { icon: IconName; title: string; detail: string }[] = [
  {
    icon: 'graduation-cap',
    title: 'Learn step by step',
    detail: 'From the rules to advanced play.',
  },
  { icon: 'puzzle', title: 'Solve puzzles', detail: 'Find the best move.' },
  { icon: 'flame', title: 'Build a streak', detail: 'Play a little every day.' },
];

export default function WelcomeScreen() {
  const [step, setStep] = useState<'intro' | 'level'>('intro');
  const level = useProgressStore((state) => state.level);
  const setLevel = useProgressStore((state) => state.setLevel);
  const startCourse = useProgressStore((state) => state.startCourse);
  function choose(chosen: PuzzleLevel) {
    setLevel(chosen);
    router.replace('/');
  }
  // New players get the easiest puzzles and go straight to the first lesson.
  function startFromScratch() {
    setLevel(1);
    const first = courseLessons[0].lesson.id;
    router.replace('/learn');
    if (startCourse(first)) router.push({ pathname: '/course/[id]', params: { id: first } });
  }
  if (step === 'level')
    return (
      <Screen edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.levelIntro}>
          <ThemedText type="title" accessibilityRole="header">
            How well do you play?
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            We&apos;ll pick puzzles to match. You can change this any time.
          </ThemedText>
        </View>
        <ListRow
          icon="graduation-cap"
          title="I'm new to chess"
          detail="Start with how the pieces move"
          onPress={startFromScratch}
        />
        <LevelPicker current={level} onChoose={choose} />
      </Screen>
    );
  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      footer={<Button label="Get started" onPress={() => setStep('level')} />}>
      <View style={styles.hero}>
        <WelcomeScene />
        <ThemedText type="display" accessibilityRole="header" style={styles.centered}>
          Welcome to ChessPal
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centered}>
          Get better at chess in a few minutes a day.
        </ThemedText>
      </View>
      <View style={styles.features}>
        {FEATURES.map((feature) => (
          <View key={feature.title} style={styles.feature}>
            <IconBadge name={feature.icon} size={48} />
            <View style={styles.featureText}>
              <ThemedText type="subtitle">{feature.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {feature.detail}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
  },
  centered: { textAlign: 'center' },
  features: { gap: Spacing.four, paddingHorizontal: Spacing.two },
  feature: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  featureText: { flex: 1, gap: Spacing.half },
  levelIntro: { gap: Spacing.two, paddingTop: Spacing.four, paddingBottom: Spacing.two },
});
