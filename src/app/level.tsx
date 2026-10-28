import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { IconBadge } from '@/components/ui';
import { type PuzzleLevel } from '@/content/types';
import { LEVELS } from '@/content/levels';
import { Radius, Spacing } from '@/constants/theme';
import { useElevation, useTheme } from '@/hooks/use-theme';
import { useProgressStore } from '@/progress/store';

const LEVEL_ICONS: Record<PuzzleLevel, IconName> = { 1: 'play', 2: 'target', 3: 'trophy' };

export default function LevelScreen() {
  const { then } = useLocalSearchParams<{ then?: string }>();
  const current = useProgressStore((state) => state.level);
  const setLevel = useProgressStore((state) => state.setLevel);
  const startPractice = useProgressStore((state) => state.startPractice);
  const theme = useTheme();
  const elevation = useElevation();
  function choose(level: PuzzleLevel) {
    setLevel(level);
    if (then === 'practice' && startPractice()) router.replace('/workout');
    else router.back();
  }
  return (
    <Screen>
      <View style={styles.intro}>
        <ThemedText type="title" accessibilityRole="header">
          Choose your level.
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Each round mixes a couple of easier puzzles, mostly puzzles at your level and a couple of
          harder ones. You can change this any time.
        </ThemedText>
      </View>
      {LEVELS.map((level) => {
        const selected = current === level.value;
        return (
          <Pressable
            key={level.value}
            accessibilityRole="button"
            accessibilityLabel={`${level.name}: ${level.description}`}
            accessibilityState={{ selected }}
            onPress={() => choose(level.value)}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: theme.surface,
                borderColor: selected ? theme.accentFill : theme.border,
                borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                boxShadow: elevation.card,
              },
              pressed && styles.pressed,
            ]}>
            <IconBadge name={LEVEL_ICONS[level.value]} size={44} />
            <View style={styles.text}>
              <ThemedText type="headline">{level.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {level.description}
              </ThemedText>
            </View>
            {selected ? (
              <Icon name="check" color="accent" />
            ) : (
              <Icon name="chevron-right" color="textSecondary" />
            )}
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: Spacing.two, paddingTop: Spacing.two, paddingBottom: Spacing.two },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    minHeight: 88,
  },
  text: { flex: 1, gap: Spacing.half },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
