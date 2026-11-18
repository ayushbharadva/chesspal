import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Disclosure, IconBadge, Pill, SectionTitle } from '@/components/ui';
import { puzzleById } from '@/content';
import { levelName } from '@/content/levels';
import { skillById } from '@/content/skills';
import { SKILL_THEMES, type SkillTheme } from '@/content/types';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useProgressStore } from '@/progress/store';
import {
  availableRungs,
  RUNG_NAMES,
  RUNG_PASS,
  RUNG_SIZE,
  RUNGS,
  skillMastered,
  type Rung,
} from '@/skills/ladder';
import { themeStats } from '@/skills/themes';

const RUNG_DESCRIPTIONS: Record<Rung, string> = {
  1: 'Theme shown. A gentle start.',
  2: 'Theme hidden. Spot it yourself.',
  3: 'Mixed with other themes. Pass to master it.',
};

export default function SkillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = SKILL_THEMES.find((item) => item === id);
  const level = useProgressStore((state) => state.level) ?? 1;
  const progress = useProgressStore((state) =>
    theme ? state.skillProgress[level]?.[theme] : undefined,
  );
  const attempts = useProgressStore((state) => state.attempts);
  const session = useProgressStore((state) => state.currentSession);
  const startSkill = useProgressStore((state) => state.startSkill);
  const [blocked, setBlocked] = useState(false);
  const available = useMemo(() => (theme ? availableRungs(theme, level) : []), [theme, level]);
  const stats = useMemo(
    () =>
      theme
        ? themeStats(attempts, puzzleById).byTheme.find((item) => item.theme === theme)
        : undefined,
    [attempts, theme],
  );
  if (!theme)
    return (
      <Screen>
        <ThemedText>This skill is unavailable.</ThemedText>
        <Button label="Back to puzzles" onPress={() => router.replace('/puzzles')} />
      </Screen>
    );
  const skill = skillById[theme];
  const mastered = skillMastered(progress, available);
  const nextRung = available.find((rung) => !progress?.cleared.includes(rung));
  function start(rung: Rung) {
    if (startSkill(theme as SkillTheme, rung)) router.push('/workout');
    else setBlocked(true);
  }
  return (
    <Screen>
      <View style={styles.intro}>
        <ThemedText type="title" accessibilityRole="header">
          {skill.name}
        </ThemedText>
        <ThemedText themeColor="textSecondary">{skill.summary}</ThemedText>
        {mastered && <Pill icon="check" tone="success" label="Mastered" />}
      </View>
      <Card variant="hero">
        <View style={styles.lookFor}>
          <IconBadge name="eye" tone="hero" size={40} />
          <View style={styles.lookForText}>
            <ThemedText type="label" themeColor="heroAccent">
              Look for
            </ThemedText>
            <ThemedText type="subtitle" themeColor="onHero">
              {skill.lookFor}
            </ThemedText>
          </View>
        </View>
      </Card>
      <Disclosure title="How it works" icon="lightbulb">
        <ThemedText>{skill.card}</ThemedText>
      </Disclosure>
      <SectionTitle>{`Rounds · ${levelName(level)}`}</SectionTitle>
      {blocked && session && session.phase !== 'complete' && (
        <Card variant="accent">
          <ThemedText>Finish your current puzzles first.</ThemedText>
          <Button
            variant="secondary"
            label="Resume puzzles"
            onPress={() => router.push('/workout')}
          />
        </Card>
      )}
      {RUNGS.map((rung) => (
        <RungRow
          key={rung}
          rung={rung}
          cleared={progress?.cleared.includes(rung) ?? false}
          available={available.includes(rung)}
          recommended={rung === nextRung}
          detail={RUNG_DESCRIPTIONS[rung]}
          onStart={() => start(rung)}
        />
      ))}
      <ThemedText type="small" themeColor="textSecondary">
        Solve {RUNG_PASS} of {RUNG_SIZE} with no hints or mistakes to pass a round.
      </ThemedText>
      {stats && (
        <Card>
          <ThemedText type="label" themeColor="textSecondary">
            Your record
          </ThemedText>
          <ThemedText type="headline">
            {Math.round((stats.independent / stats.attempts) * 100)}% solved without help
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {stats.attempts} {stats.attempts === 1 ? 'puzzle' : 'puzzles'} so far
          </ThemedText>
        </Card>
      )}
    </Screen>
  );
}

function RungRow({
  rung,
  cleared,
  available,
  recommended,
  detail,
  onStart,
}: {
  rung: Rung;
  cleared: boolean;
  available: boolean;
  recommended: boolean;
  detail: string;
  onStart: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.rung,
        { backgroundColor: theme.surface, borderColor: cleared ? theme.success : theme.border },
      ]}>
      <View style={styles.rungHeader}>
        <IconBadge
          name={cleared ? 'check' : rung === 3 ? 'target' : 'puzzle'}
          tone={cleared ? 'success' : 'accent'}
          solid={cleared}
          size={36}
        />
        <View style={styles.rungText}>
          <ThemedText type="subtitle">
            {rung}. {RUNG_NAMES[rung]}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {available ? detail : 'Not enough puzzles at this level yet.'}
          </ThemedText>
        </View>
      </View>
      {available && (
        <Button
          size="compact"
          variant={recommended ? 'primary' : 'secondary'}
          label={
            cleared
              ? `Replay ${RUNG_NAMES[rung].toLowerCase()}`
              : `Start ${RUNG_NAMES[rung].toLowerCase()}`
          }
          onPress={onStart}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { gap: Spacing.two, paddingTop: Spacing.two },
  lookFor: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  lookForText: { flex: 1, gap: Spacing.half },
  rung: {
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.three,
  },
  rungHeader: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  rungText: { flex: 1, gap: Spacing.half },
});
