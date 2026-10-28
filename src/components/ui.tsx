import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useElevation, useTheme } from '@/hooks/use-theme';

/** Small rounded label, such as a streak count or a lesson mode. */
export function Pill({
  label,
  icon,
  tone = 'muted',
}: {
  label: string;
  icon?: IconName;
  tone?: 'muted' | 'accent' | 'success' | 'danger' | 'onHero';
}) {
  const theme = useTheme();
  const colors: Record<typeof tone, { background: string; text: ThemeColor }> = {
    muted: { background: theme.surfaceMuted, text: 'textSecondary' },
    accent: { background: theme.accentSurface, text: 'accent' },
    success: { background: theme.successSurface, text: 'success' },
    danger: { background: theme.dangerSurface, text: 'danger' },
    onHero: { background: theme.heroOverlay, text: 'heroAccent' },
  };
  const { background, text } = colors[tone];
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      {icon && <Icon name={icon} size={14} color={text} strokeWidth={2.4} />}
      <ThemedText type="overline" themeColor={text}>
        {label}
      </ThemedText>
    </View>
  );
}

export function ProgressBar({
  value,
  track = 'surfaceMuted',
  fill = 'accentFill',
}: {
  value: number;
  track?: ThemeColor;
  fill?: ThemeColor;
}) {
  const theme = useTheme();
  const percent = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View
      style={[styles.track, { backgroundColor: theme[track] }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View style={[styles.fill, { width: `${percent}%`, backgroundColor: theme[fill] }]} />
    </View>
  );
}

/** Rounded square holding an icon, used to lead list rows and card headers. */
export function IconBadge({
  name,
  tone = 'accent',
  size = 40,
  solid = false,
}: {
  name: IconName;
  tone?: 'accent' | 'success' | 'danger' | 'muted' | 'hero';
  size?: number;
  /** Filled with the tone color; use on cards already tinted with that tone. */
  solid?: boolean;
}) {
  const theme = useTheme();
  const colors: Record<typeof tone, { background: string; icon: ThemeColor }> = {
    accent: { background: theme.accentSurface, icon: 'accent' },
    success: { background: theme.successSurface, icon: 'success' },
    danger: { background: theme.dangerSurface, icon: 'danger' },
    muted: { background: theme.surfaceMuted, icon: 'textSecondary' },
    hero: { background: theme.heroOverlay, icon: 'heroAccent' },
  };
  const { background, icon } = solid
    ? { background: theme[colors[tone].icon], icon: 'surface' as const }
    : colors[tone];
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size * 0.32, backgroundColor: background },
      ]}>
      <Icon name={name} size={size * 0.5} color={icon} strokeWidth={solid ? 2.6 : 2} />
    </View>
  );
}

/** A tappable row with a leading icon, a title, optional detail and a chevron. */
export function ListRow({
  title,
  detail,
  icon,
  onPress,
  accessibilityLabel,
  trailing,
}: {
  title: string;
  detail?: string;
  icon?: IconName;
  onPress: () => void;
  accessibilityLabel?: string;
  trailing?: ReactNode;
}) {
  const theme = useTheme();
  const elevation = useElevation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          boxShadow: elevation.card,
        },
        pressed && styles.pressed,
      ]}>
      {icon && <IconBadge name={icon} />}
      <View style={styles.rowText}>
        <ThemedText type="subtitle">{title}</ThemedText>
        {detail ? (
          <ThemedText type="small" themeColor="textSecondary">
            {detail}
          </ThemedText>
        ) : null}
      </View>
      {trailing ?? <Icon name="chevron-right" size={20} color="textSecondary" />}
    </Pressable>
  );
}

/** Two or more mutually exclusive choices drawn as one control; each segment is a button. */
export function Segmented<Value extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: Value; label: string; icon?: IconName }[];
  value: Value;
  onChange: (value: Value) => void;
}) {
  const theme = useTheme();
  const elevation = useElevation();
  return (
    <View style={[styles.segmented, { backgroundColor: theme.surfaceMuted }]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              active && { backgroundColor: theme.surfaceRaised, boxShadow: elevation.card },
            ]}>
            {option.icon && (
              <Icon
                name={option.icon}
                size={16}
                color={active ? 'text' : 'textSecondary'}
                strokeWidth={2.2}
              />
            )}
            <ThemedText type="smallBold" themeColor={active ? 'text' : 'textSecondary'}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Choice chip that wraps in a row; used for picking a lesson branch. */
export function Chip({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected
          ? { backgroundColor: theme.primary, borderColor: theme.primary }
          : { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="smallBold" themeColor={selected ? 'onPrimary' : 'text'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function SectionTitle({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="overline" themeColor="textSecondary">
        {children}
      </ThemedText>
      {action}
    </View>
  );
}

/** Small dots for multi-step progress, such as cleared skill rounds. */
export function StepDots({ steps }: { steps: readonly { done: boolean; available: boolean }[] }) {
  const theme = useTheme();
  return (
    <View
      style={styles.dots}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {steps.map((step, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            step.done
              ? { backgroundColor: theme.accentFill }
              : { borderColor: theme.border, borderWidth: 1.5 },
            !step.available && styles.unavailable,
          ]}
        />
      ))}
    </View>
  );
}

/** Bulleted line with a small brass marker, for plans and tips. */
export function Bullet({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <View style={styles.bullet}>
      <View style={[styles.marker, { backgroundColor: theme.accentFill }]} />
      <ThemedText style={styles.bulletText}>{children}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one + Spacing.half,
    paddingHorizontal: Spacing.two + Spacing.one,
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: Radius.pill,
  },
  track: { height: 6, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
  badge: { alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 72,
  },
  rowText: { flex: 1, gap: Spacing.half },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  segmented: { flexDirection: 'row', padding: Spacing.one, borderRadius: Radius.medium, gap: 4 },
  segment: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.small,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  dots: { flexDirection: 'row', gap: Spacing.one },
  dot: { width: 10, height: 10, borderRadius: 5 },
  unavailable: { opacity: 0.3 },
  bullet: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  marker: { width: 6, height: 6, borderRadius: 3, marginTop: 9 },
  bulletText: { flex: 1 },
});
