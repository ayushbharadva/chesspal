import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';

// Real numbers arrive in Milestone 9; until then every stat is empty.
const STAT_LABELS = [
  'Workouts completed',
  'Challenges solved',
  'Accuracy',
  'Current streak',
  'Best streak',
];

export default function ProgressScreen() {
  return (
    <Screen>
      <ThemedView type="surface" style={styles.statsCard}>
        {STAT_LABELS.map((label) => (
          <StatRow key={label} label={label} value={null} />
        ))}
      </ThemedView>
    </Screen>
  );
}

function StatRow({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value ?? 'no data yet'}`}>
      <ThemedText>{label}</ThemedText>
      <ThemedText type="smallBold">{value ?? '—'}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    padding: Spacing.three,
    borderRadius: Radius.large,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 40,
  },
});
