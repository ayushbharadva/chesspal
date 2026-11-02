import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { LEVELS } from '@/content/levels';
import { PUZZLE_LEVELS, type PuzzleLevel } from '@/content/types';
import { Radius, Spacing } from '@/constants/theme';
import { useElevation, useTheme } from '@/hooks/use-theme';

/** The puzzle levels as large tappable cards, with the current one checked. */
export function LevelPicker({
  current,
  onChoose,
}: {
  current: PuzzleLevel | null;
  onChoose: (level: PuzzleLevel) => void;
}) {
  const theme = useTheme();
  const elevation = useElevation();
  return (
    <View style={styles.list}>
      {LEVELS.map((level) => {
        const selected = current === level.value;
        return (
          <Pressable
            key={level.value}
            accessibilityRole="button"
            accessibilityLabel={`${level.name}: ${level.description}`}
            accessibilityState={{ selected }}
            onPress={() => onChoose(level.value)}
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
            <LevelBars level={level.value} />
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
    </View>
  );
}

/** Rising bars filled up to a level, so the levels read as one ladder. */
export function LevelBars({ level }: { level: PuzzleLevel }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.bars, { backgroundColor: theme.accentSurface }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {PUZZLE_LEVELS.map((step) => (
        <View
          key={step}
          style={[
            styles.bar,
            { height: 8 + step * 4 },
            step <= level
              ? { backgroundColor: theme.accent }
              : { backgroundColor: theme.textSecondary, opacity: 0.25 },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.three },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    minHeight: 88,
  },
  text: { flex: 1, gap: Spacing.half },
  bars: {
    width: 44,
    height: 44,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
    paddingBottom: 10,
  },
  bar: { width: 4, borderRadius: 2 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
