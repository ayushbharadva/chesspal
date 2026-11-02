import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { useProgressStore } from '@/progress/store';

const SOURCES = {
  move: require('../../assets/sounds/move.wav'),
  capture: require('../../assets/sounds/capture.wav'),
  check: require('../../assets/sounds/check.wav'),
  checkmate: require('../../assets/sounds/checkmate.wav'),
  correct: require('../../assets/sounds/correct.wav'),
  wrong: require('../../assets/sounds/wrong.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;
export const SOUND_NAMES = Object.keys(SOURCES) as SoundName[];

/** Lets a move's own sound land before a chime that follows it. */
export const CHIME_DELAY_MS = 170;

// One player per sound, kept for the life of the app so effects start without loading delay.
let players: Record<SoundName, AudioPlayer> | null = null;

function loadPlayers() {
  // Short effects follow the silent switch and leave the player's music playing.
  void setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(
    () => undefined,
  );
  return Object.fromEntries(
    SOUND_NAMES.map((name) => [name, createAudioPlayer(SOURCES[name])]),
  ) as Record<SoundName, AudioPlayer>;
}

/** Plays a sound effect when the player has sounds on. A sound can never interrupt a puzzle. */
export function playSound(name: SoundName) {
  if (!useProgressStore.getState().settings.sounds) return;
  try {
    players ??= loadPlayers();
    const player = players[name];
    void Promise.resolve(player.seekTo(0))
      .then(() => player.play())
      .catch(() => undefined);
  } catch {
    // Audio can be unavailable on some devices; practice carries on silently.
  }
}
