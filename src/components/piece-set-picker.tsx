import { Pressable, StyleSheet, View } from 'react-native';

import { Piece } from '@/components/board/piece';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useElevation, useTheme } from '@/hooks/use-theme';
import { type PieceSetId } from '@/progress/types';

/** Each set's name and designer; the designer credit is the attribution its licence asks for. */
const SETS: readonly { id: PieceSetId; name: string; designer: string }[] = [
  { id: 'classic', name: 'Classic', designer: 'Maurizio Monge' },
  { id: 'modern', name: 'Modern', designer: 'philatype' },
  { id: 'wood', name: 'Wood', designer: 'RhosGFX' },
];

/** The piece sets side by side, each previewed with a white knight and a black queen. */
export function PieceSetPicker({
  value,
  onChange,
}: {
  value: PieceSetId;
  onChange: (set: PieceSetId) => void;
}) {
  const theme = useTheme();
  const elevation = useElevation();
  return (
    <View style={styles.row}>
      {SETS.map((set) => {
        const selected = set.id === value;
        return (
          <Pressable
            key={set.id}
            accessibilityRole="button"
            accessibilityLabel={`${set.name} pieces by ${set.designer}`}
            accessibilityState={{ selected }}
            onPress={() => onChange(set.id)}
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
            <View style={styles.preview}>
              <View style={[styles.square, { backgroundColor: theme.boardLight }]}>
                <Piece piece={{ color: 'w', type: 'n' }} set={set.id} />
              </View>
              <View style={[styles.square, { backgroundColor: theme.boardDark }]}>
                <Piece piece={{ color: 'b', type: 'q' }} set={set.id} />
              </View>
            </View>
            <ThemedText type="smallBold">{set.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.designer}>
              {set.designer}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  option: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.large,
  },
  preview: {
    flexDirection: 'row',
    borderRadius: Radius.small,
    overflow: 'hidden',
    marginBottom: Spacing.one,
  },
  square: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  designer: { textAlign: 'center' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
