import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyProgress } from '@/progress/types';
import { decodeProgress, validProgress } from '@/storage/schema';
import { flushProgressWrites, progressStorage, PROGRESS_KEY } from '@/storage/storage';
import { chooseFork, makeRouteSession, makeSession } from '@/workout/session';

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
it('loads older saves with route and settings defaults', () => {
  const { routeRuns: _runs, settings: _settings, ...older } = emptyProgress();
  const decoded = decodeProgress(JSON.stringify({ state: older, version: 1 })).state;
  expect(decoded.routeRuns).toEqual([]);
  expect(decoded.settings).toEqual({ appearance: 'system', haptics: true, sounds: true });
});
it('keeps settings saved before sound effects existed and turns sounds on', () => {
  const state = { ...emptyProgress(), settings: { appearance: 'dark', haptics: false } };
  const decoded = decodeProgress(JSON.stringify({ state, version: 1 })).state;
  expect(decoded.settings).toEqual({ appearance: 'dark', haptics: false, sounds: true });
  expect(
    validProgress({
      ...emptyProgress(),
      settings: { appearance: 'dark', haptics: false, sounds: 'loud' },
    }),
  ).toBe(false);
});
it('round-trips a route session and rejects impossible route data', () => {
  const route = makeRouteSession('route-a', '2026-10-13', [], 1);
  const choosing = {
    ...route,
    route: { ...route.route!, choosing: true },
    index: 1,
    results: [
      {
        id: 'a',
        puzzleId: route.puzzleIds[0],
        independent: true,
        dateKey: '2026-10-13',
        completedAt: '2026-10-13T10:00:00.000Z',
      },
    ],
  };
  expect(validProgress({ ...emptyProgress(), currentSession: choosing })).toBe(true);
  expect(validProgress({ ...emptyProgress(), currentSession: chooseFork(choosing, true) })).toBe(
    true,
  );
  const { route: _route, ...noRoute } = route;
  expect(validProgress({ ...emptyProgress(), currentSession: noRoute })).toBe(false);
  expect(
    validProgress({
      ...emptyProgress(),
      currentSession: { ...route, route: { ...route.route!, steepIds: ['nope', 'nope'] } },
    }),
  ).toBe(false);
  expect(
    validProgress({
      ...emptyProgress(),
      currentSession: { ...route, route: { ...route.route!, taken: [0] } },
    }),
  ).toBe(false);
  expect(
    validProgress({
      ...emptyProgress(),
      currentSession: { ...makeSession('x', 'daily', '2026-10-13', []), route: route.route },
    }),
  ).toBe(false);
});
it('rejects invalid route runs and settings', () => {
  const run = { dateKey: '2026-10-13', score: 8, steepTaken: 1, level: 2 };
  expect(validProgress({ ...emptyProgress(), routeRuns: [run] })).toBe(true);
  expect(validProgress({ ...emptyProgress(), routeRuns: [{ ...run, score: -1 }] })).toBe(false);
  expect(validProgress({ ...emptyProgress(), routeRuns: [{ ...run, steepTaken: 3 }] })).toBe(false);
  expect(
    validProgress({ ...emptyProgress(), settings: { appearance: 'neon', haptics: true } }),
  ).toBe(false);
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
it('fills level, skill and vision defaults into saves from earlier versions', async () => {
  const { level, skillProgress, visionScores, ...earlier } = emptyProgress();
  expect([level, skillProgress, visionScores]).toEqual([null, {}, { w: [], b: [] }]);
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify({ state: earlier, version: 1 }));
  const restored = JSON.parse((await progressStorage.getItem(PROGRESS_KEY)) as string);
  expect(restored.state).toMatchObject({
    level: null,
    skillProgress: {},
    visionScores: { w: [], b: [] },
  });
});
it('moves skill progress from before per-level progress under the saved level', async () => {
  const session = makeSession('old-skill', 'skill', '2026-10-13', [], 3, {
    theme: 'pin',
    rung: 2,
    run: 1,
    level: 3,
  });
  const { level: omitted, ...oldSkill } = session.skill!;
  void omitted;
  const earlier = {
    ...emptyProgress(),
    level: 3,
    skillProgress: { fork: { cleared: [1, 2], runs: 3 } },
    currentSession: { ...session, skill: oldSkill },
  };
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify({ state: earlier, version: 1 }));
  const restored = decodeProgress((await progressStorage.getItem(PROGRESS_KEY))!).state;
  expect(restored.skillProgress).toEqual({ 3: { fork: { cleared: [1, 2], runs: 3 } } });
  expect(restored.currentSession?.skill).toEqual({ theme: 'pin', rung: 2, run: 1, level: 3 });
  // An upgraded save loads unchanged the next time.
  const upgraded = JSON.stringify({ state: restored, version: 1 });
  await AsyncStorage.setItem(PROGRESS_KEY, upgraded);
  expect(await progressStorage.getItem(PROGRESS_KEY)).toBe(upgraded);
});
it('rejects malformed levels, skill progress, vision scores and skill sessions', () => {
  const valid = {
    ...emptyProgress(),
    level: 2,
    skillProgress: { fork: { cleared: [1, 3], runs: 4 } },
    visionScores: { w: [12, 15], b: [] },
  };
  expect(validProgress(valid)).toBe(true);
  expect(validProgress({ ...valid, level: 5 })).toBe(true);
  expect(validProgress({ ...valid, level: 6 })).toBe(false);
  expect(validProgress({ ...valid, level: 0 })).toBe(false);
  expect(validProgress({ ...valid, skillProgress: { castling: { cleared: [], runs: 0 } } })).toBe(
    false,
  );
  expect(
    validProgress({ ...valid, skillProgress: { 5: { fork: { cleared: [3], runs: 1 } } } }),
  ).toBe(true);
  expect(
    validProgress({ ...valid, skillProgress: { 6: { fork: { cleared: [3], runs: 1 } } } }),
  ).toBe(false);
  expect(validProgress({ ...valid, skillProgress: { fork: { cleared: [1, 1], runs: 2 } } })).toBe(
    false,
  );
  expect(validProgress({ ...valid, visionScores: { w: Array(21).fill(1), b: [] } })).toBe(false);
  const session = makeSession('skill', 'skill', '2026-10-13', [], 1, {
    theme: 'fork',
    rung: 1,
    run: 0,
    level: 1,
  });
  expect(session.puzzleIds).toHaveLength(5);
  expect(validProgress({ ...valid, currentSession: session })).toBe(true);
  const { skill, ...withoutSkill } = session;
  expect(skill).toBeDefined();
  expect(validProgress({ ...valid, currentSession: withoutSkill })).toBe(false);
  expect(
    validProgress({
      ...valid,
      currentSession: { ...makeSession('d', 'daily', '2026-10-13', []), skill },
    }),
  ).toBe(false);
});
