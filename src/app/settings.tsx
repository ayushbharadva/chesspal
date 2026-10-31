import { router } from 'expo-router';
import { StyleSheet, Switch, View } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ListRow, SectionTitle, Segmented } from '@/components/ui';
import { levelName } from '@/content/levels';
import { Spacing } from '@/constants/theme';
import { useHaptics } from '@/hooks/use-haptics';
import { useTheme } from '@/hooks/use-theme';
import { useProgressStore } from '@/progress/store';
import { type Appearance } from '@/progress/types';
import { playSound } from '@/sounds/play-sound';

const APPEARANCES: readonly { value: Appearance; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const haptic = useHaptics();
  const settings = useProgressStore((state) => state.settings);
  const level = useProgressStore((state) => state.level);
  const updateSettings = useProgressStore((state) => state.updateSettings);
  return (
    <Screen>
      <SectionTitle>Appearance</SectionTitle>
      <Segmented
        options={APPEARANCES}
        value={settings.appearance}
        onChange={(appearance) => updateSettings({ appearance })}
      />
      <SectionTitle>Feel</SectionTitle>
      <Card>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <ThemedText type="subtitle">Haptic feedback</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              A light buzz when you move, solve or miss.
            </ThemedText>
          </View>
          <Switch
            accessibilityLabel="Haptic feedback"
            value={settings.haptics}
            trackColor={{ true: theme.accentFill, false: theme.surfaceMuted }}
            thumbColor={theme.pieceWhite}
            onValueChange={(haptics) => {
              updateSettings({ haptics });
              if (haptics) haptic('tick');
            }}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <ThemedText type="subtitle">Sound effects</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Moves, captures, checks and wins. Your phone&apos;s silent switch turns them off too.
            </ThemedText>
          </View>
          <Switch
            accessibilityLabel="Sound effects"
            value={settings.sounds}
            trackColor={{ true: theme.accentFill, false: theme.surfaceMuted }}
            thumbColor={theme.pieceWhite}
            onValueChange={(sounds) => {
              updateSettings({ sounds });
              playSound('move');
            }}
          />
        </View>
      </Card>
      <SectionTitle>Practice</SectionTitle>
      <ListRow
        icon="puzzle"
        title="Puzzle level"
        detail={levelName(level)}
        onPress={() => router.push('/level')}
      />
      <ThemedText type="small" themeColor="textSecondary">
        Everything you do in ChessPal stays on this device. There is no account and nothing is sent
        anywhere.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  rowText: { flex: 1, gap: Spacing.half },
});
