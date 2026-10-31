import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createAudioPlayer } from 'expo-audio';

import { useProgressStore } from '@/progress/store';
import { defaultSettings } from '@/progress/types';
import { playSound, SOUND_NAMES } from '@/sounds/play-sound';

function readWav(name: string) {
  const file = readFileSync(join(__dirname, '../../../assets/sounds', `${name}.wav`));
  const samples = (file.length - 44) / 2;
  let peak = 0;
  for (let index = 0; index < samples; index += 1)
    peak = Math.max(peak, Math.abs(file.readInt16LE(44 + index * 2)));
  return {
    riff: file.toString('ascii', 0, 4),
    channels: file.readUInt16LE(22),
    sampleRate: file.readUInt32LE(24),
    seconds: samples / file.readUInt32LE(24),
    peak: peak / 32767,
    last: file.readInt16LE(file.length - 2),
  };
}

it.each(SOUND_NAMES)('%s is a short, audible, unclipped file that ends cleanly', (name) => {
  const sound = readWav(name);
  expect(sound.riff).toBe('RIFF');
  expect(sound.channels).toBe(1);
  expect(sound.sampleRate).toBe(44100);
  expect(sound.seconds).toBeLessThanOrEqual(1.2);
  expect(sound.peak).toBeGreaterThan(0.15);
  expect(sound.peak).toBeLessThan(0.6);
  // Stopping away from zero would make an audible click.
  expect(Math.abs(sound.last)).toBeLessThan(500);
});

it('keeps chimes quieter than the board, and big moments louder than small ones', () => {
  expect(readWav('correct').peak).toBeLessThan(readWav('move').peak);
  expect(readWav('wrong').peak).toBeLessThan(readWav('move').peak);
  expect(readWav('move').peak).toBeLessThan(readWav('capture').peak);
  expect(readWav('capture').peak).toBeLessThan(readWav('checkmate').peak);
});

it('stays silent when sounds are off, and survives an audio failure', () => {
  const load = jest.mocked(createAudioPlayer);
  useProgressStore.setState({ settings: { ...defaultSettings(), sounds: false } });
  load.mockClear();
  playSound('move');
  expect(load).not.toHaveBeenCalled();
  useProgressStore.setState({ settings: defaultSettings() });
  load.mockImplementation(() => {
    throw new Error('audio unavailable');
  });
  expect(() => playSound('move')).not.toThrow();
});
