import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { readPosition } from '@/chess';
import { Board } from '@/components/board/board';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { type CourseStep } from '@/content/types';
import { Radius, Spacing } from '@/constants/theme';
import { useHaptics } from '@/hooks/use-haptics';
import { useTheme } from '@/hooks/use-theme';
import { playSound } from '@/sounds/play-sound';

export type StepOf<Kind extends CourseStep['kind']> = Extract<CourseStep, { kind: Kind }>;
export interface StepProps<Kind extends CourseStep['kind']> {
  step: StepOf<Kind>;
  /** Called once, when the step is solved, with its slips and the note to show. */
  onComplete: (slips: number, note?: string) => void;
  done: boolean;
}

/** A board that only shows a position, with the step's marks and arrows. */
export function StepBoard({ step }: { step: CourseStep & { fen?: string } }) {
  if (!('fen' in step) || !step.fen) return null;
  return (
    <Board
      fen={step.fen}
      orientation={'orientation' in step && step.orientation ? step.orientation : 'w'}
      marks={'marks' in step ? step.marks : undefined}
      arrows={'arrows' in step ? step.arrows : undefined}
    />
  );
}

export function ReadStep({ step }: StepProps<'read'>) {
  return (
    <View style={styles.step}>
      <ThemedText type="subtitle">{step.text}</ThemedText>
      <StepBoard step={step} />
    </View>
  );
}

export function ChoiceStep({ step, onComplete, done }: StepProps<'choice'>) {
  const theme = useTheme();
  const haptic = useHaptics();
  const [wrong, setWrong] = useState<number[]>([]);
  function choose(index: number) {
    if (done || wrong.includes(index)) return;
    if (index === step.answer) {
      haptic('success');
      playSound('correct');
      onComplete(wrong.length, step.explanation);
    } else {
      haptic('error');
      playSound('wrong');
      setWrong([...wrong, index]);
    }
  }
  return (
    <View style={styles.step}>
      <ThemedText type="subtitle">{step.prompt}</ThemedText>
      {step.fen && (
        <Board
          fen={step.fen}
          orientation={step.orientation ?? readPosition(step.fen).turn}
          marks={step.marks}
          arrows={step.arrows}
        />
      )}
      <View style={styles.options}>
        {step.options.map((option, index) => {
          const isWrong = wrong.includes(index);
          const isRight = done && index === step.answer;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={option}
              accessibilityState={{ disabled: done || isWrong, selected: isRight }}
              onPress={() => choose(index)}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: theme.surface, borderColor: theme.border },
                isWrong && { backgroundColor: theme.dangerSurface, borderColor: theme.danger },
                isRight && { backgroundColor: theme.successSurface, borderColor: theme.success },
                pressed && styles.pressed,
              ]}>
              <ThemedText
                type="subtitle"
                style={styles.optionText}
                themeColor={isWrong ? 'danger' : isRight ? 'success' : 'text'}>
                {option}
              </ThemedText>
              {(isWrong || isRight) && (
                <Icon
                  name={isWrong ? 'x' : 'check'}
                  size={20}
                  color={isWrong ? 'danger' : 'success'}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({
  step: { gap: Spacing.three },
  options: { gap: Spacing.two },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 1.5,
  },
  optionText: { flex: 1 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  message: { minHeight: 24 },
  row: { flexDirection: 'row', gap: Spacing.two },
});
