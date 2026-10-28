import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyProgress } from '@/progress/types';
import { decodeProgress, validProgress } from '@/storage/schema';
import { flushProgressWrites, progressStorage, PROGRESS_KEY } from '@/storage/storage';
import { makeSession } from '@/workout/session';

beforeEach(async () => {
  await flushProgressWrites();
  await AsyncStorage.clear();
});
it('round-trips an interrupted session', async () => {
  const state = {
    ...emptyProgress(),
    currentSession: {
      ...makeSession('resume', 'daily', '2026-10-13', []),
      usedHelp: true,
      hintsShown: 1,
    },
  };
  const raw = JSON.stringify({ state, version: 1 });
  await progressStorage.setItem(PROGRESS_KEY, raw);
  expect(await progressStorage.getItem(PROGRESS_KEY)).toBe(raw);
  expect(decodeProgress(raw).state).toEqual(state);
});
it('backs up corruption and rejects impossible saved positions', async () => {
  await AsyncStorage.setItem(PROGRESS_KEY, '{broken');
  expect(await progressStorage.getItem(PROGRESS_KEY)).toBeNull();
  expect(await AsyncStorage.getItem(`${PROGRESS_KEY}-backup`)).toBe('{broken');
  const session = makeSession('invalid', 'daily', '2026-10-13', []);
  expect(validProgress({ ...emptyProgress(), currentSession: { ...session, ply: 999 } })).toBe(
    false,
  );
  expect(
    validProgress({
      ...emptyProgress(),
      currentSession: { ...session, acceptedFen: 'invalid fen' },
    }),
  ).toBe(false);
  expect(() => decodeProgress(JSON.stringify({ state: emptyProgress(), version: 99 }))).toThrow();
});
it('serializes writes to keep the most recent snapshot', async () => {
  const first = JSON.stringify({ state: emptyProgress(), version: 1 });
  const last = JSON.stringify({
    state: { ...emptyProgress(), currentSession: makeSession('latest', 'extra', '2026-10-13', []) },
    version: 1,
  });
  await Promise.all([
    progressStorage.setItem(PROGRESS_KEY, first),
    progressStorage.setItem(PROGRESS_KEY, last),
  ]);
  expect(await progressStorage.getItem(PROGRESS_KEY)).toBe(last);
});
it('rejects a guide resume point on the opponent turn', () => {
  const state = {
    ...emptyProgress(),
    guideProgress: { 'caro-kann': { viewedPly: 0, practicePly: 0, completedAt: null } },
  };
  expect(validProgress(state)).toBe(false);
  state.guideProgress['caro-kann'].practicePly = 1;
  expect(validProgress(state)).toBe(true);
});

it('normalizes legacy learning state without losing puzzle history or saved guide positions', async () => {
  const { lessonProgress: omitted, ...legacy } = emptyProgress();
  void omitted;
  legacy.guideProgress['italian-game'] = { viewedPly: 4, practicePly: 2, completedAt: null };
  legacy.currentSession = makeSession('old-in-progress', 'daily', '2026-10-13', []);
  const raw = JSON.stringify({ state: legacy, version: 1 });
  await AsyncStorage.setItem(PROGRESS_KEY, raw);
  const restored = decodeProgress((await progressStorage.getItem(PROGRESS_KEY))!).state;
  expect(restored.guideProgress).toEqual(legacy.guideProgress);
  expect(restored.currentSession).toEqual(legacy.currentSession);
  expect(restored.lessonProgress).toEqual(emptyProgress().lessonProgress);
  expect(await AsyncStorage.getItem(`${PROGRESS_KEY}-backup`)).toBeNull();
});
