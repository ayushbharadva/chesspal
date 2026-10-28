import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  /** `accent` is the brass call to action used on dark hero cards. */
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'onHero';
  icon?: IconName;
  size?: 'regular' | 'compact';
};

const variants: Record<
  NonNullable<ButtonProps['variant']>,
  { background?: ThemeColor; border?: ThemeColor; text: ThemeColor }
> = {
  primary: { background: 'primary', text: 'onPrimary' },
  accent: { background: 'heroAccent', text: 'onHeroAccent' },
  secondary: { background: 'surface', border: 'border', text: 'text' },
  ghost: { text: 'text' },
  onHero: { border: 'onHeroSecondary', text: 'onHero' },
};

export function Button({
  label,
  variant = 'primary',
  icon,
  size = 'regular',
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const colors = variants[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(rest.disabled) }}
      style={({ pressed }) => [
        styles.button,
        size === 'compact' && styles.compact,
        colors.background && { backgroundColor: theme[colors.background] },
        colors.border && { borderColor: theme[colors.border], borderWidth: 1 },
        pressed && styles.pressed,
        rest.disabled && styles.disabled,
      ]}
      {...rest}>
      <View style={styles.content}>
        {icon && <Icon name={icon} size={18} color={colors.text} />}
        <ThemedText style={styles.label} themeColor={colors.text}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  compact: { minHeight: 50, paddingHorizontal: Spacing.two },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  label: { fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
});
