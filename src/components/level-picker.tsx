import { Pressable, StyleSheet, View } from 'react-native';

import { type PieceType } from '@/chess';
import { Piece } from '@/components/board/piece';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { LEVELS } from '@/content/levels';
import { type PuzzleLevel } from '@/content/types';
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
            <LevelPiece level={level.value} />
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

/** Each level is a piece of rising value, pawn to queen, so the levels read as one ladder. */
const LEVEL_PIECES: Record<PuzzleLevel, PieceType> = { 1: 'p', 2: 'n', 3: 'b', 4: 'r', 5: 'q' };

export function LevelPiece({ level }: { level: PuzzleLevel }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.badge, { backgroundColor: theme.accentSurface }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Piece piece={{ color: 'w', type: LEVEL_PIECES[level] }} />
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
  badge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
