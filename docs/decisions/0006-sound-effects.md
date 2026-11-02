# 0006: Sound effects

Date: 2026-10-31. Status: accepted for now; see the to-do below.

## Context

After testing on an iPhone, the owner found the haptics satisfying but missed sound. A first set of 14 sounds, with bells and short melodies, felt like a cheap game. The owner asked for sounds that are minimal and premium, then compared three new sets by ear (felt, walnut and stone) and chose walnut for now.

## Decision

- **Few sounds:** only six. Move, capture, check and checkmate play for every move on the board, including replies, solution replays and lesson demonstrations. A soft tone marks an independent solve, and another marks a wrong move. Castling and promotion use the move sound, or the capture sound if they take a piece. Hints, illegal moves, finished rounds, milestones and board vision are silent, and their haptics stay.
- **No jingles:** no bells, melodies or fanfares. Check is a firmer click with one quiet low note, and checkmate is a heavy click with one soft low chord.
- **Originals:** `scripts/sounds/generate-sounds.ts` synthesizes all six into `assets/sounds` (about 235 KB of WAV). No third-party audio is bundled, so there is nothing to license.
- **Behavior:** sounds follow the phone's silent switch and mix with other audio, so a player's music keeps playing. A Settings switch turns them off. Audio errors are ignored, so a sound can never interrupt practice.

## To-do: upgrade the sounds

The owner accepted walnut as a stopgap: the sounds still need an upgrade before release. Synthesis was written without being able to listen to the result, so the next round should start from the owner's ear. Options include a reference app whose sounds the owner likes, and recordings of a real wooden set made or licensed for ChessPal. Replacing the files in `assets/sounds` needs no code changes.

## Libraries

`expo-audio` plays the sounds; it is Expo's recommended audio module, and `expo-asset` is its required peer. Its config plugin would otherwise add a microphone permission and background playback by default. Both are turned off in `app.json`, because ChessPal only plays short effects and its "no data collected" position should stay obvious.

## Consequences

- Dev builds need `npx expo prebuild` and a rebuild, because native modules were added.
- Older saves keep their settings and get sounds on by default; the store version stays 1.
- A person must judge how the sounds feel. Tests check only that the files are valid, short, unclipped and suitably balanced in volume.

## Alternatives considered

- **Lichess's or Chess.com's sounds:** familiar, but their licences or ownership rule them out for this app.
- **A volume slider:** the phone's own volume already does this.
