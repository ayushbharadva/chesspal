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
      accessibilityState={{ disabled: Boolean(rest.disabled) }}
      style={({ pressed }) => [
        styles.button,
        isPrimary
          ? { backgroundColor: theme.primary }
          : { borderColor: theme.border, borderWidth: StyleSheet.hairlineWidth * 2 },
        pressed && styles.pressed,
        rest.disabled && styles.disabled,
      ]}
      {...rest}>
      <ThemedText
        type="subtitle"
        style={styles.label}
        themeColor={isPrimary ? 'onPrimary' : 'text'}>
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
    paddingVertical: Spacing.two,
  },
  label: { textAlign: 'center' },
  pressed: {
    opacity: 0.8,
  },
  disabled: { opacity: 0.45 },
});
