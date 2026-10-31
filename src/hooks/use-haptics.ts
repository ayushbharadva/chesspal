import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useProgressStore } from '@/progress/store';

export type HapticKind = 'tick' | 'success' | 'error';

function play(kind: HapticKind) {
  // Expo's docs recommend the Android haptics API over the older vibrator simulation.
  if (Platform.OS === 'android') {
    const types = {
      tick: Haptics.AndroidHaptics.Segment_Tick,
      success: Haptics.AndroidHaptics.Confirm,
      error: Haptics.AndroidHaptics.Reject,
    };
    return Haptics.performAndroidHapticsAsync(types[kind]);
  }
  if (kind === 'tick') return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  return Haptics.notificationAsync(
    kind === 'success'
      ? Haptics.NotificationFeedbackType.Success
      : Haptics.NotificationFeedbackType.Error,
  );
}

/** Plays a haptic when the player has them on. Devices without haptics simply ignore it. */
export function useHaptics() {
  const enabled = useProgressStore((state) => state.settings.haptics);
  return (kind: HapticKind) => {
    if (enabled) void Promise.resolve(play(kind)).catch(() => undefined);
  };
}
