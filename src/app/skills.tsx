import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ListRow, Pill, SectionTitle, StepDots } from '@/components/ui';
import { puzzleById } from '@/content';
import { levelName } from '@/content/levels';
import { skillById, skillUnits } from '@/content/skills';
import { type SkillTheme } from '@/content/types';
import { Spacing } from '@/constants/theme';
import { useProgressStore } from '@/progress/store';
import {
  availableRungs,
  RUNGS,
  skillMastered,
  type Rung,
  type SkillProgress,
} from '@/skills/ladder';
import { strengthsAndWeaknesses } from '@/skills/themes';

export default function SkillsScreen() {
  const level = useProgressStore((state) => state.level) ?? 1;
  const progress = useProgressStore((state) => state.skillProgress);
  const attempts = useProgressStore((state) => state.attempts);
  const weak = useMemo(
    () => new Set(strengthsAndWeaknesses(attempts, puzzleById).weak.map((stats) => stats.theme)),
    [attempts],
  );
  const available = useMemo(
    () =>
      Object.fromEntries(
        skillUnits
          .flatMap((unit) => unit.skills)
          .map((theme) => [theme, availableRungs(theme, level)]),
      ) as Record<SkillTheme, Rung[]>,
    [level],
  );
  const mastered = skillUnits
    .flatMap((unit) => unit.skills)
    .filter((theme) => skillMastered(progress[theme], available[theme])).length;
  return (
    <Screen>
      <View style={styles.intro}>
        <ThemedText type="title" accessibilityRole="header">
          Build your skills.
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Each skill has three short rounds: a warm-up, a round at your level and a test that does
          not tell you the theme. Solve four of five without help to clear a round.
        </ThemedText>
        <Pill
          icon="trophy"
          tone="accent"
          label={`${mastered} of ${Object.keys(available).length} mastered · ${levelName(level)}`}
        />
      </View>
      {skillUnits.map((unit) => (
        <View key={unit.id} style={styles.unit}>
          <SectionTitle>{unit.title}</SectionTitle>
          {unit.skills.map((theme) => (
            <ListRow
              key={theme}
              icon={skillMastered(progress[theme], available[theme]) ? 'check' : 'puzzle'}
              title={skillById[theme].name}
              detail={
                weak.has(theme)
                  ? 'Worth practicing · ' + skillById[theme].summary
                  : skillById[theme].summary
              }
              accessibilityLabel={`${skillById[theme].name}: ${describeProgress(progress[theme], available[theme])}`}
              trailing={
                <StepDots
                  steps={RUNGS.map((rung) => ({
                    done: progress[theme]?.cleared.includes(rung) ?? false,
                    available: available[theme].includes(rung),
                  }))}
                />
              }
              onPress={() => router.push({ pathname: '/skill/[id]', params: { id: theme } })}
            />
          ))}
        </View>
      ))}
    </Screen>
  );
}

function describeProgress(progress: SkillProgress | undefined, available: readonly Rung[]) {
  if (skillMastered(progress, available)) return 'mastered';
  const cleared = progress?.cleared.length ?? 0;
  return `${cleared} of ${available.length} rounds cleared`;
}

const styles = StyleSheet.create({
  intro: { gap: Spacing.two, paddingTop: Spacing.two },
  unit: { gap: Spacing.three },
});
