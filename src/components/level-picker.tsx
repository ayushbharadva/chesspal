import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { IconBadge } from '@/components/ui';
import { LEVELS } from '@/content/levels';
import { type PuzzleLevel } from '@/content/types';
import { Radius, Spacing } from '@/constants/theme';
import { useElevation, useTheme } from '@/hooks/use-theme';

const LEVEL_ICONS: Record<PuzzleLevel, IconName> = { 1: 'play', 2: 'target', 3: 'trophy' };

/** The three puzzle levels as large tappable cards, with the current one checked. */
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
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
