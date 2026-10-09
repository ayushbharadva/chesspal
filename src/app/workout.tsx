import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';

export default function WorkoutScreen() {
  return (
    <Screen>
      <ThemedText type="smallBold" themeColor="textSecondary">
        Challenge 1 of 3
      </ThemedText>

      <ThemedView type="surface" style={styles.boardPlaceholder}>
        <ThemedText themeColor="textSecondary">The chessboard arrives in Milestone 3.</ThemedText>
      </ThemedView>

      {/* Replace, not push, so Android back from the result goes home instead of into the workout. */}
      <Button label="Finish workout" onPress={() => router.replace('/result')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  boardPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
});
