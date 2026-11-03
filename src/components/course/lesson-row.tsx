import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { type LessonStatus, type Stars } from '@/course/path';
import { useTheme } from '@/hooks/use-theme';

/** One to three stars, filled up to `stars`. */
export function StarRow({ stars, size = 16 }: { stars: number; size?: number }) {
  return (
    <View
      style={styles.stars}
      accessible
      accessibilityLabel={`${stars} of 3 stars`}
      accessibilityRole="image">
      {[1, 2, 3].map((place) => (
        <Icon
          key={place}
          name="star"
          size={size}
          color={place <= stars ? 'accentFill' : 'textSecondary'}
          fill={place <= stars ? 'accentFill' : undefined}
          strokeWidth={1.8}
        />
      ))}
    </View>
  );
}

/** A lesson on the Learn path: finished (with stars), next, or locked. */
export function LessonRow({
  number,
  title,
  status,
  stars,
  last,
  onPress,
}: {
  number: number;
  title: string;
  status: LessonStatus;
  stars?: Stars;
  /** The last lesson in its unit draws no line below its node. */
  last: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const locked = status === 'locked';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        locked
          ? `${title}, locked`
          : status === 'done'
            ? `${title}, ${stars} of 3 stars`
            : `Start lesson: ${title}`
      }
      accessibilityState={{ disabled: locked }}
      disabled={locked}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.rail}>
        <View
          style={[
            styles.node,
            status === 'done' && { backgroundColor: theme.successSurface },
            status === 'next' && { backgroundColor: theme.primary },
            locked && { backgroundColor: theme.surfaceMuted },
          ]}>
          {status === 'done' ? (
            <Icon name="check" size={20} color="success" strokeWidth={2.6} />
          ) : status === 'next' ? (
            <Icon name="play" size={18} color="onPrimary" fill="onPrimary" />
          ) : (
            <Icon name="lock" size={16} color="textSecondary" />
          )}
        </View>
        {!last && <View style={[styles.line, { backgroundColor: theme.border }]} />}
      </View>
      <View style={styles.text}>
        <ThemedText type="overline" themeColor={status === 'next' ? 'accent' : 'textSecondary'}>
          {status === 'next' ? 'Up next' : `Lesson ${number}`}
        </ThemedText>
        <ThemedText type="subtitle" themeColor={locked ? 'textSecondary' : 'text'}>
          {title}
        </ThemedText>
        {status === 'done' && stars && <StarRow stars={stars} size={14} />}
      </View>
    </Pressable>
  );
}

const NODE = 44;
const styles = StyleSheet.create({
  stars: { flexDirection: 'row', gap: Spacing.half },
  row: { flexDirection: 'row', gap: Spacing.three, minHeight: 64 },
  rail: { width: NODE, alignItems: 'center' },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { width: 2, flex: 1, minHeight: Spacing.three },
  text: { flex: 1, gap: Spacing.half, paddingTop: Spacing.half, paddingBottom: Spacing.three },
  pressed: { opacity: 0.85 },
});
