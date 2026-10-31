/**
 * Synthesizes ChessPal's sound effects into assets/sounds. Everything is generated here, so the
 * sounds are original and need no licence file. Run `npm run sounds:build` after changing them.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SAMPLE_RATE = 44_100;

type Track = Float64Array;
/** A resonance of the struck material: frequency in Hz, level, and decay in seconds. */
type Mode = readonly [number, number, number];

interface Material {
  /** Resonances of the piece and board. Inharmonic, as real wood is. */
  modes: readonly Mode[];
  /** The brief contact noise at the instant of impact. */
  contact: { level: number; cutoff: number; decay: number };
  /** How slowly the strike starts, in seconds. A softer base starts more slowly. */
  softness: number;
  /** Nothing above this frequency survives, which removes the harshness of raw synthesis. */
  brightness: number;
  /** Level of the small room around the board. */
  room: number;
  /** Notes in Hz for the quiet tones. */
  checkTone: number;
  correctTone: number;
  wrongTone: number;
  mateChord: readonly number[];
}

/** Walnut: a natural wooden click with a little air around it. */
const WALNUT: Material = {
  modes: [
    [338, 0.7, 0.032],
    [731, 1, 0.024],
    [1187, 0.55, 0.015],
    [2043, 0.22, 0.008],
    [3310, 0.07, 0.004],
  ],
  contact: { level: 0.2, cutoff: 4000, decay: 0.0013 },
  softness: 0.0007,
  brightness: 6000,
  room: 0.07,
  checkTone: 440,
  correctTone: 659.25,
  wrongTone: 220,
  mateChord: [146.83, 220, 293.66],
};

// A fixed seed keeps the noise, and so the files, identical between runs.
let noiseState = 0x2f6e2b1;
function noise() {
  noiseState = (noiseState * 1664525 + 1013904223) >>> 0;
  return noiseState / 2147483648 - 1;
}

function lowPass(track: Track, cutoff: number) {
  const smoothing = 1 - Math.exp((-2 * Math.PI * cutoff) / SAMPLE_RATE);
  // Two passes roll off high frequencies more steeply than one.
  for (let pass = 0; pass < 2; pass += 1) {
    let state = 0;
    for (let index = 0; index < track.length; index += 1) {
      state += smoothing * (track[index] - state);
      track[index] = state;
    }
  }
}

/** One decaying resonance with a smooth raised-cosine start, so it never clicks. */
function addPartial(
  track: Track,
  start: number,
  frequency: number,
  level: number,
  decay: number,
  attack: number,
) {
  const first = Math.round(start * SAMPLE_RATE);
  for (let index = first; index < track.length; index += 1) {
    const time = (index - first) / SAMPLE_RATE;
    const rise = time < attack ? 0.5 - 0.5 * Math.cos((Math.PI * time) / attack) : 1;
    const amount = level * rise * Math.exp(-time / decay);
    if (amount < 0.00005 && time > attack) break;
    track[index] += amount * Math.sin(2 * Math.PI * frequency * time);
  }
}

/** A piece meeting the board. `weight` above 1 sounds heavier: lower, longer and firmer. */
function addImpact(track: Track, start: number, material: Material, gain = 1, weight = 1) {
  for (const [frequency, level, decay] of material.modes)
    addPartial(
      track,
      start,
      frequency / weight,
      gain * level,
      decay * weight,
      material.softness * weight,
    );
  const contact = new Float64Array(track.length);
  const first = Math.round(start * SAMPLE_RATE);
  for (let index = first; index < track.length; index += 1) {
    const time = (index - first) / SAMPLE_RATE;
    if (time > material.contact.decay * 10) break;
    contact[index] = noise() * Math.exp(-time / material.contact.decay);
  }
  lowPass(contact, material.contact.cutoff);
  contact.forEach((sample, index) => {
    track[index] += sample * material.contact.level * gain * 6;
  });
}

/** A quiet, rounded note in the manner of a felted piano: no bell, no chime. */
function addTone(track: Track, start: number, frequency: number, gain: number, decay: number) {
  const attack = 0.009;
  addPartial(track, start, frequency, gain, decay, attack);
  addPartial(track, start, frequency * 2, gain * 0.16, decay * 0.5, attack);
  addPartial(track, start, frequency * 3, gain * 0.035, decay * 0.28, attack);
}

/** A faint, short room tail. Dry synthesis sounds artificial; this places it in a space. */
function addRoom(track: Track, level: number) {
  const length = Math.round(0.11 * SAMPLE_RATE);
  const impulse = new Float64Array(length);
  for (let index = 0; index < length; index += 1)
    impulse[index] = noise() * Math.exp(-(index / SAMPLE_RATE) / 0.028);
  lowPass(impulse, 2600);
  const wet = new Float64Array(track.length);
  for (let index = 0; index < track.length; index += 1) {
    if (Math.abs(track[index]) < 0.0005) continue;
    const end = Math.min(length, track.length - index);
    for (let tap = 0; tap < end; tap += 1) wet[index + tap] += track[index] * impulse[tap];
  }
  const wetPeak = wet.reduce((most, sample) => Math.max(most, Math.abs(sample)), 0);
  const dryPeak = track.reduce((most, sample) => Math.max(most, Math.abs(sample)), 0);
  wet.forEach((sample, index) => {
    track[index] += (sample / wetPeak) * dryPeak * level;
  });
}

const SOUNDS: Record<
  string,
  { seconds: number; peak: number; draw: (track: Track, material: Material) => void }
> = {
  move: {
    seconds: 0.2,
    peak: 0.36,
    draw: (track, material) => addImpact(track, 0, material),
  },
  capture: {
    seconds: 0.24,
    peak: 0.46,
    draw: (track, material) => {
      // The taken piece is touched just before the capturing piece lands.
      addImpact(track, 0, material, 0.3, 0.85);
      addImpact(track, 0.03, material, 1, 1.18);
    },
  },
  check: {
    seconds: 0.5,
    peak: 0.42,
    draw: (track, material) => {
      addImpact(track, 0, material, 1, 1.05);
      addTone(track, 0.035, material.checkTone, 0.16, 0.13);
    },
  },
  checkmate: {
    seconds: 1.1,
    peak: 0.5,
    draw: (track, material) => {
      addImpact(track, 0, material, 1, 1.32);
      for (const [index, note] of material.mateChord.entries())
        addTone(track, 0.03, note, 0.3 - index * 0.07, 0.3);
    },
  },
  correct: {
    seconds: 0.42,
    peak: 0.2,
    draw: (track, material) => addTone(track, 0, material.correctTone, 1, 0.1),
  },
  wrong: {
    seconds: 0.26,
    peak: 0.2,
    draw: (track, material) => addTone(track, 0, material.wrongTone, 1, 0.055),
  },
};

function encodeWav(track: Track, peak: number) {
  const fade = Math.round(0.02 * SAMPLE_RATE);
  const loudest = track.reduce((most, sample) => Math.max(most, Math.abs(sample)), 0);
  const data = Buffer.alloc(track.length * 2);
  track.forEach((sample, index) => {
    const tail = Math.min(1, (track.length - index) / fade);
    data.writeInt16LE(Math.round((sample / loudest) * peak * tail * 32767), index * 2);
  });
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const output = join(__dirname, '..', '..', 'assets', 'sounds');
mkdirSync(output, { recursive: true });
let total = 0;
for (const [name, sound] of Object.entries(SOUNDS)) {
  const track = new Float64Array(Math.ceil(sound.seconds * SAMPLE_RATE));
  sound.draw(track, WALNUT);
  addRoom(track, WALNUT.room);
  lowPass(track, WALNUT.brightness);
  const file = encodeWav(track, sound.peak);
  writeFileSync(join(output, `${name}.wav`), file);
  total += file.length;
}
console.log(`${Object.keys(SOUNDS).length} sounds, ${(total / 1024).toFixed(0)} KB in ${output}`);
