import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: 'primary' | 'secondary';
};

export function Button({ label, variant = 'primary', ...rest }: ButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        isPrimary
          ? { backgroundColor: theme.primary }
          : { borderColor: theme.border, borderWidth: StyleSheet.hairlineWidth * 2 },
        pressed && styles.pressed,
      ]}
      {...rest}>
      <ThemedText type="subtitle" themeColor={isPrimary ? 'onPrimary' : 'text'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: Radius.large,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  pressed: {
    opacity: 0.8,
  },
});
