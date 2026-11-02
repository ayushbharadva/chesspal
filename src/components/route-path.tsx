import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { type RouteStep } from '@/daily-route/route';
import { useTheme } from '@/hooks/use-theme';

/** The five puzzles of a daily challenge, with choices marked and points on finished ones. */
export function RoutePath({ steps, onHero = false }: { steps: RouteStep[]; onHero?: boolean }) {
  const theme = useTheme();
  const line = onHero ? theme.heroOverlay : theme.border;
  const total = steps.reduce((sum, step) => sum + (step.points ?? 0), 0);
  const finished = steps.filter((step) => step.state === 'done').length;
  return (
    <View
      style={styles.path}
      accessible
      accessibilityLabel={`Challenge: ${finished} of ${steps.length} puzzles done, ${total} points`}>
      {steps.map((step, index) => (
        <Fragment key={index}>
          {index > 0 && <View style={[styles.line, { backgroundColor: line }]} />}
          <View
            style={[
              styles.node,
              step.state === 'done' && {
                backgroundColor: step.points ? theme.heroAccent : theme.surfaceMuted,
              },
              step.state === 'current' && { borderColor: theme.accentFill, borderWidth: 2 },
              step.state === 'upcoming' && { borderColor: line, borderWidth: 1.5 },
            ]}>
            {step.state === 'done' ? (
              <ThemedText
                type="smallBold"
                themeColor={step.points ? 'onHeroAccent' : 'textSecondary'}>
                {step.points}
              </ThemedText>
            ) : step.fork ? (
              <Icon
                name={step.steep ? 'mountain' : 'route'}
                size={16}
                color={onHero ? 'onHeroSecondary' : 'textSecondary'}
              />
            ) : (
              <ThemedText type="small" themeColor={onHero ? 'onHeroSecondary' : 'textSecondary'}>
                {index + 1}
              </ThemedText>
            )}
          </View>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  path: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.half },
  line: { flex: 1, height: 2 },
  node: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
