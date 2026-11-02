jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Moves apply instantly in tests; board motion is covered by its own hook test.
jest.mock('./src/hooks/use-motion', () => ({ useMotionEnabled: () => false }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  performAndroidHapticsAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
  AndroidHaptics: { Segment_Tick: 'segment-tick', Confirm: 'confirm', Reject: 'reject' },
}));

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    seekTo: jest.fn(() => Promise.resolve()),
    play: jest.fn(),
  })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));
