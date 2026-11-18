import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook } from '@testing-library/react-native';
import { act, cleanup, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { guideById, puzzleById, puzzles } from '@/content';
import { courseLessonById, courseLessons } from '@/content/course';
import { refutationsAt } from '@/content/refutations';
import { coursePuzzles } from '@/course/steps';
import { skillById } from '@/content/skills';
import { branchForGuide, transfersForGuide } from '@/content/lessons';
import {
  answerLesson,
  beginLesson,
  lessonAttempt,
  lessonKey,
  restartLesson,
} from '@/learning/lesson';
import { describeMove, INITIAL_POSITION, legalMoves, playMove } from '@/chess';
import { useColorSchemeName } from '@/hooks/use-theme';
import { useProgressStore } from '@/progress/store';
import { emptyProgress } from '@/progress/types';
import { flushProgressWrites, PROGRESS_KEY } from '@/storage/storage';
import { dateKey } from '@/utils/date-key';
import { wrongMoveMessage } from '@/workout/refutation';
import { reviewQueue, reviewSchedule } from '@/workout/review';
import { makeSession } from '@/workout/session';

// Openings are switched off in the app; most tests still cover them, so they start switched on.
let mockShowOpenings = true;
jest.mock('@/constants/features', () => ({
  get SHOW_OPENINGS() {
    return mockShowOpenings;
  },
}));

async function renderApp(initialUrl = '/') {
  const rendering = renderRouter('./src/app', { initialUrl });
  await rendering;
  return { getPathname: () => rendering.getPathname() };
}
async function move(uci: string) {
  await fireEvent.press(screen.getByTestId(`square-${uci.slice(0, 2)}`));
  await fireEvent.press(screen.getByTestId(`square-${uci.slice(2, 4)}`));
}
beforeEach(async () => {
  mockShowOpenings = true;
  await flushProgressWrites();
  await AsyncStorage.clear();
  await useProgressStore.persist.rehydrate();
  useProgressStore.setState({
    ...emptyProgress(),
    level: 1,
    hydrated: true,
    storageIssue: false,
  });
});
afterEach(async () => {
  await flushProgressWrites();
});

it('completes five real puzzles, shows results and allows more practice', async () => {
  const app = await renderApp();
  await fireEvent.press(screen.getByRole('button', { name: 'Start puzzles' }));
  expect(app.getPathname()).toBe('/workout');
  expect(screen.getByText('Puzzle 1 of 5 · Beginner')).toBeOnTheScreen();
  for (let index = 0; index < 5; index += 1) {
    const session = useProgressStore.getState().currentSession!;
    const puzzle = puzzleById[session.puzzleIds[index]];
    for (let ply = 0; ply < puzzle.moves.length; ply += 2) await move(puzzle.moves[ply]);
    await fireEvent.press(
      screen.getByRole('button', { name: index === 4 ? 'See results' : 'Next puzzle' }),
    );
  }
  expect(app.getPathname()).toBe('/result');
  expect(screen.getByText('5 / 5')).toBeOnTheScreen();
  expect(useProgressStore.getState().attempts).toHaveLength(5);
  await fireEvent.press(screen.getByRole('button', { name: 'More puzzles' }));
  expect(app.getPathname()).toBe('/workout');
  expect(useProgressStore.getState().currentSession!.mode).toBe('extra');
});

it('starts an unfinished puzzle over after leaving the round, keeping its help', async () => {
  const app = await renderApp();
  await fireEvent.press(screen.getByRole('button', { name: 'Start puzzles' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Hint' }));
  const session = useProgressStore.getState().currentSession!;
  const puzzle = puzzleById[session.puzzleIds[0]];
  const wrong = legalMoves(puzzle.fen).find(
    (candidate) =>
      candidate.uci !== puzzle.moves[0] && !playMove(puzzle.fen, candidate.uci).checkmate,
  )!;
  await move(wrong.uci);
  expect(useProgressStore.getState().currentSession).toMatchObject({
    hintsShown: 1,
    usedHelp: true,
    mistakes: 1,
  });
  await act(() => router.back());
  expect(app.getPathname()).toBe('/');
  expect(useProgressStore.getState().currentSession).toMatchObject({
    index: 0,
    ply: 0,
    hintsShown: 0,
    lastWrong: false,
    usedHelp: true,
    mistakes: 1,
  });
  await fireEvent.press(screen.getByRole('button', { name: 'Resume puzzles' }));
  expect(app.getPathname()).toBe('/workout');
  expect(screen.queryByText('Hint 1')).not.toBeOnTheScreen();
  expect(screen.queryByText('Not quite. Try again.')).not.toBeOnTheScreen();
});

it('answers a wrong move with the reply and a reason, then resets the puzzle', async () => {
  await renderApp();
  await fireEvent.press(screen.getByRole('button', { name: 'Start puzzles' }));
  const session = useProgressStore.getState().currentSession!;
  const puzzle = puzzleById[session.puzzleIds[0]];
  const [wrong, refutation] = [...refutationsAt(puzzle.id, 0)!].find(
    ([, candidate]) => candidate.reply,
  )!;
  await move(wrong);
  expect(screen.getByText('Not quite.')).toBeOnTheScreen();
  expect(screen.getByText(wrongMoveMessage(puzzle, 0, wrong, refutation, true))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Hint' })).not.toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Back one move' })).not.toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Reset' }));
  expect(screen.queryByText('Not quite.')).not.toBeOnTheScreen();
  for (let ply = 0; ply < puzzle.moves.length; ply += 2) await move(puzzle.moves[ply]);
  expect(useProgressStore.getState().attempts.at(-1)).toMatchObject({
    puzzleId: puzzle.id,
    independent: false,
  });
});

it('takes back a wrong second move with Back one move, keeping the first', async () => {
  const puzzle = puzzles.find((candidate) => candidate.moves.length === 3)!;
  useProgressStore.setState({
    currentSession: { ...makeSession('two-moves', 'extra', dateKey(), []), puzzleIds: [puzzle.id] },
  });
  await renderApp('/workout');
  await move(puzzle.moves[0]);
  const [wrong] = [...refutationsAt(puzzle.id, 2)!].find(([, candidate]) => candidate.reply)!;
  await move(wrong);
  expect(screen.getByText('Not quite.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Back one move' }));
  expect(screen.queryByText('Not quite.')).not.toBeOnTheScreen();
  expect(useProgressStore.getState().currentSession).toMatchObject({
    ply: 2,
    wrongMove: null,
    mistakes: 1,
  });
  await move(puzzle.moves[2]);
  expect(useProgressStore.getState().attempts.at(-1)).toMatchObject({
    puzzleId: puzzle.id,
    independent: false,
  });
});

it('records solution replay as assisted and keeps completion idempotent', async () => {
  await renderApp();
  await fireEvent.press(screen.getByRole('button', { name: 'Start puzzles' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Show answer' }));
  while (useProgressStore.getState().currentSession?.phase === 'replay')
    await fireEvent.press(screen.getByRole('button', { name: 'Next move' }));
  expect(useProgressStore.getState().attempts[0].independent).toBe(false);
  const count = useProgressStore.getState().attempts.length;
  useProgressStore.getState().answer('a1a1');
  expect(useProgressStore.getState().attempts).toHaveLength(count);
});

it('opens an independently solved due puzzle from Home and persists its next review', async () => {
  const now = new Date();
  const previousDay = new Date(now);
  previousDay.setDate(previousDay.getDate() - 1);
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + 3);
  const puzzle = Object.values(puzzleById)[0];
  const previousAttempt = {
    id: 'legacy-independent',
    puzzleId: puzzle.id,
    independent: true,
    dateKey: dateKey(previousDay),
    completedAt: previousDay.toISOString(),
  };
  await flushProgressWrites();
  await AsyncStorage.setItem(
    PROGRESS_KEY,
    JSON.stringify({
      version: 1,
      state: { ...emptyProgress(), level: 1, attempts: [previousAttempt] },
    }),
  );
  await useProgressStore.persist.rehydrate();
  const app = await renderApp();
  expect(screen.getByText('Replay earlier puzzles so they stick')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Review 1 puzzle' }));
  expect(app.getPathname()).toBe('/workout');
  expect(useProgressStore.getState().currentSession).toMatchObject({
    mode: 'review',
    puzzleIds: [puzzle.id],
  });
  for (let ply = 0; ply < puzzle.moves.length; ply += 2) await move(puzzle.moves[ply]);
  await fireEvent.press(screen.getByRole('button', { name: 'See results' }));
  expect(screen.getByText('1 / 1')).toBeOnTheScreen();
  expect(useProgressStore.getState().attempts.at(-1)?.independent).toBe(true);
  await flushProgressWrites();
  const savedRaw = await AsyncStorage.getItem(PROGRESS_KEY);
  await act(async () => {
    useProgressStore.setState({ ...emptyProgress(), level: 1 });
    await flushProgressWrites();
    await AsyncStorage.setItem(PROGRESS_KEY, savedRaw!);
    await useProgressStore.persist.rehydrate();
  });
  const restored = useProgressStore.getState();
  expect(restored.attempts).toHaveLength(2);
  expect(reviewSchedule(restored.attempts).get(puzzle.id)?.dueDate).toBe(dateKey(nextReview));
  expect(reviewQueue(restored.attempts, dateKey(now))).toEqual([]);
  await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(app.getPathname()).toBe('/');
  expect(screen.queryByRole('button', { name: /Review \d+ puzzles?/ })).not.toBeOnTheScreen();
});

it.each(['italian-game', 'caro-kann', 'queens-gambit'])(
  'plays a complete sourced guide: %s',
  async (id) => {
    await renderApp(`/lesson/${id}`);
    await fireEvent.press(screen.getByRole('button', { name: 'Play' }));
    const guide = guideById[id];
    for (let ply = guide.side === 'b' ? 1 : 0; ply < guide.moves.length; ply += 2)
      await move(guide.moves[ply]);
    expect(useProgressStore.getState().guideProgress[id].completedAt).not.toBeNull();
    expect(screen.getByText('Line complete')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByRole('header', { name: 'Openings' })).toBeOnTheScreen();
  },
);

it('restores a saved session and displays real progress', async () => {
  useProgressStore.getState().startPractice();
  useProgressStore.getState().hint();
  await flushProgressWrites();
  const savedId = useProgressStore.getState().currentSession!.id;
  const savedRaw = await AsyncStorage.getItem(PROGRESS_KEY);
  useProgressStore.setState({ currentSession: null });
  await flushProgressWrites();
  await AsyncStorage.setItem(PROGRESS_KEY, savedRaw!);
  await useProgressStore.persist.rehydrate();
  expect(useProgressStore.getState().currentSession?.id).toBe(savedId);
  const app = await renderApp();
  await fireEvent.press(screen.getByRole('button', { name: /^Progress, tab/ }));
  expect(app.getPathname()).toBe('/progress');
  expect(screen.getByLabelText('Puzzles played: 0')).toBeOnTheScreen();
});

it('fades branch help, restarts an interrupted recall with its mistakes and records retries honestly', async () => {
  await renderApp('/lesson/italian-game');
  const branch = branchForGuide('italian-game', 'evans-gambit')!;
  await fireEvent.press(screen.getByRole('button', { name: `Choose ${branch.title}` }));
  await fireEvent.press(screen.getByRole('button', { name: 'Play' }));
  expect(screen.getByText('With hints')).toBeOnTheScreen();
  expect(screen.getByText(describeMove(INITIAL_POSITION, branch.moves[0]))).toBeOnTheScreen();
  for (let ply = 0; ply < branch.moves.length; ply += 2) await move(branch.moves[ply]);
  expect(useProgressStore.getState().lessonProgress.attempts.at(-1)?.independent).toBe(false);
  await fireEvent.press(screen.getByRole('button', { name: 'Play it from memory' }));
  expect(screen.getByText('From memory')).toBeOnTheScreen();
  expect(screen.queryByText(describeMove(INITIAL_POSITION, branch.moves[0]))).not.toBeOnTheScreen();
  expect(screen.queryByText(branch.notes[0])).not.toBeOnTheScreen();
  await move('g1h3');
  expect(screen.getByText(/not the move in this line/)).toBeOnTheScreen();
  await move(branch.moves[0]);
  const key = lessonKey('branch', 'italian-game', branch.id);
  await flushProgressWrites();
  const raw = await AsyncStorage.getItem(PROGRESS_KEY);
  await act(async () => {
    useProgressStore.setState(emptyProgress());
    await flushProgressWrites();
    await AsyncStorage.setItem(PROGRESS_KEY, raw!);
    await useProgressStore.persist.rehydrate();
  });
  expect(useProgressStore.getState().lessonProgress.sessions[key]).toMatchObject({
    ply: 0,
    mistakes: 1,
    scaffold: 'recall',
  });
  for (let ply = 0; ply < branch.moves.length; ply += 2) await move(branch.moves[ply]);
  expect(useProgressStore.getState().lessonProgress.attempts).toHaveLength(2);
  expect(useProgressStore.getState().lessonProgress.attempts.at(-1)?.independent).toBe(false);
  expect(useProgressStore.getState().attempts).toEqual([]);
});

it('returns to the requested main branch after playing a supported alternate', async () => {
  await renderApp('/lesson/italian-game');
  const main = branchForGuide('italian-game', 'main')!;
  const alternate = branchForGuide('italian-game', 'evans-gambit')!;
  const mainKey = lessonKey('branch', 'italian-game', 'main');
  const alternateKey = lessonKey('branch', 'italian-game', 'evans-gambit');
  await fireEvent.press(screen.getByRole('button', { name: 'Play' }));
  for (const ply of [0, 2, 4, 6]) await move(alternate.moves[ply]);
  expect(useProgressStore.getState().lessonProgress.selected['italian-game']).toBe(alternateKey);
  expect(useProgressStore.getState().lessonProgress.sessions[alternateKey]).toMatchObject({
    targetId: 'evans-gambit',
    ply: 8,
  });
  await fireEvent.press(screen.getByRole('button', { name: 'Choose Main line' }));
  expect(screen.getByText(main.description)).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Play' }));
  expect(useProgressStore.getState().lessonProgress.sessions[mainKey]).toMatchObject({
    targetId: 'main',
    ply: 0,
  });
  for (let ply = 0; ply < main.moves.length; ply += 2) await move(main.moves[ply]);
  expect(useProgressStore.getState().lessonProgress.attempts.at(-1)?.targetId).toBe('main');
  expect(useProgressStore.getState().lessonProgress.sessions[alternateKey].ply).toBe(8);
  await fireEvent.press(screen.getByRole('button', { name: `Choose ${alternate.title}` }));
  await fireEvent.press(screen.getByRole('button', { name: 'Play' }));
  for (let ply = 8; ply < alternate.moves.length; ply += 2) await move(alternate.moves[ply]);
  expect(
    useProgressStore.getState().lessonProgress.attempts.map((attempt) => attempt.targetId),
  ).toEqual(['main', 'evans-gambit']);
});

it('carries on into a variation left part-way, keeping its earlier help', async () => {
  const now = new Date();
  const mainKey = lessonKey('branch', 'italian-game', 'main');
  const alternateKey = lessonKey('branch', 'italian-game', 'evans-gambit');
  const alternate = branchForGuide('italian-game', 'evans-gambit')!;
  let guided = beginLesson('italian-game', 'branch', 'evans-gambit', [], now)!;
  for (let ply = 0; ply < alternate.moves.length; ply += 2)
    guided = answerLesson(guided, alternate.moves[ply]);
  const first = lessonAttempt(guided, now);
  let left = beginLesson('italian-game', 'branch', 'evans-gambit', [first], now)!;
  for (const ply of [0, 2, 4, 6, 8]) left = answerLesson(left, alternate.moves[ply]);
  left = restartLesson({ ...left, usedHelp: true, hintShown: true, mistakes: 2 });
  let main = beginLesson('italian-game', 'branch', 'main', [], now)!;
  for (const ply of [0, 2, 4]) main = answerLesson(main, alternate.moves[ply]);
  useProgressStore.setState({
    lessonProgress: {
      ...emptyProgress().lessonProgress,
      attempts: [first],
      sessions: { [mainKey]: main, [alternateKey]: left },
      selected: { 'italian-game': mainKey },
    },
  });
  await renderApp('/lesson/italian-game');
  await move('b2b4');
  expect(useProgressStore.getState().lessonProgress.sessions[mainKey]).toBeUndefined();
  expect(useProgressStore.getState().lessonProgress.sessions[alternateKey]).toMatchObject({
    id: main.id,
    ply: 8,
    usedHelp: true,
    mistakes: 2,
  });
  for (const ply of [8, 10]) await move(alternate.moves[ply]);
  expect(useProgressStore.getState().lessonProgress.attempts).toHaveLength(2);
  expect(useProgressStore.getState().lessonProgress.attempts.at(-1)?.independent).toBe(false);
});

it('tests a separate position, reveals its explanation after answering and tracks optional help', async () => {
  await renderApp('/lesson/italian-game');
  const exercise = transfersForGuide('italian-game')[0];
  await fireEvent.press(screen.getByRole('button', { name: `Try ${exercise.title}` }));
  expect(screen.queryByText(exercise.explanation)).not.toBeOnTheScreen();
  await move(exercise.answers[0]);
  expect(screen.getByText(exercise.explanation)).toBeOnTheScreen();
  expect(screen.getByText('Solved on your own!')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Try again without hints' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Hint' }));
  expect(screen.getByText(exercise.hint)).toBeOnTheScreen();
  await move(exercise.answers[0]);
  expect(
    useProgressStore.getState().lessonProgress.attempts.map((attempt) => attempt.independent),
  ).toEqual([true, false]);
});

it('opens a delayed learning review through Learn in recall mode', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const attempt = {
    id: 'guided-yesterday',
    guideId: 'italian-game',
    targetId: 'main',
    kind: 'branch' as const,
    independent: false,
    dateKey: dateKey(yesterday),
    completedAt: yesterday.toISOString(),
  };
  useProgressStore.setState({
    lessonProgress: { ...emptyProgress().lessonProgress, attempts: [attempt] },
  });
  const app = await renderApp('/openings');
  await fireEvent.press(screen.getByRole('button', { name: 'Review Italian Game: Main line' }));
  expect(app.getPathname()).toBe('/lesson/italian-game');
  expect(screen.getByText('From memory')).toBeOnTheScreen();
});

it('distinguishes main-line reviews from two different opening guides', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const attempts = ['italian-game', 'caro-kann'].map((guideId) => ({
    id: `${guideId}-yesterday`,
    guideId,
    targetId: 'main',
    kind: 'branch' as const,
    independent: false,
    dateKey: dateKey(yesterday),
    completedAt: yesterday.toISOString(),
  }));
  useProgressStore.setState({ lessonProgress: { ...emptyProgress().lessonProgress, attempts } });
  const app = await renderApp('/openings');
  expect(screen.getByRole('button', { name: 'Review Italian Game: Main line' })).toBeOnTheScreen();
  await fireEvent.press(
    screen.getByRole('button', { name: 'Review Caro-Kann Defence: Main line' }),
  );
  expect(app.getPathname()).toBe('/lesson/caro-kann');
  expect(screen.getByText('Caro-Kann Defence')).toBeOnTheScreen();
});

it('connects Home to a demonstration, related application and lesson-only activity', async () => {
  const app = await renderApp();
  await fireEvent.press(screen.getByRole('button', { name: 'Start lesson' }));
  expect(app.getPathname()).toBe('/lesson/italian-game');
  expect(screen.getByText('Move 0 of 12')).toBeOnTheScreen();
  expect(useProgressStore.getState().lessonProgress.attempts).toEqual([]);
  expect(useProgressStore.getState().lessonProgress.sessions).toEqual({});
  await fireEvent.press(screen.getByRole('button', { name: 'Play' }));
  const branch = branchForGuide('italian-game', 'main')!;
  for (let ply = 0; ply < branch.moves.length; ply += 2) await move(branch.moves[ply]);
  await act(() => router.back());
  expect(app.getPathname()).toBe('/');
  expect(screen.getByText('1 day of practice')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Start puzzles' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Try a new position' }));
  const exercise = transfersForGuide('italian-game')[0];
  expect(screen.getByText(exercise.prompt)).toBeOnTheScreen();
  expect(screen.queryByText(exercise.explanation)).not.toBeOnTheScreen();
  await move(exercise.answers[0]);
  expect(screen.getByText('Solved on your own!')).toBeOnTheScreen();
  await act(() => router.back());
  expect(screen.getByText('1 day of practice')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: /^Progress, tab/ }));
  expect(screen.getByLabelText('Puzzles played: 0')).toBeOnTheScreen();
  expect(screen.getByLabelText('Current streak: 1 day')).toBeOnTheScreen();
  expect(screen.getByLabelText('New positions solved: 1')).toBeOnTheScreen();
});

it('restarts an interrupted recalled lesson from Home after storage reload without resetting help', async () => {
  const now = new Date();
  const first = {
    id: 'earlier-guided',
    guideId: 'italian-game',
    kind: 'branch' as const,
    targetId: 'main',
    independent: false,
    dateKey: dateKey(now),
    completedAt: now.toISOString(),
  };
  let session = beginLesson('italian-game', 'branch', 'main', [first], now)!;
  session = { ...answerLesson(session, 'e2e4'), usedHelp: true, mistakes: 2 };
  const key = lessonKey('branch', 'italian-game', 'main');
  const saved = {
    ...emptyProgress(),
    level: 1,
    lessonProgress: {
      ...emptyProgress().lessonProgress,
      attempts: [first],
      sessions: { [key]: session },
      selected: { 'italian-game': key },
    },
  };
  await flushProgressWrites();
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify({ version: 1, state: saved }));
  await useProgressStore.persist.rehydrate();
  const app = await renderApp();
  await fireEvent.press(screen.getByRole('button', { name: 'Restart lesson' }));
  expect(app.getPathname()).toBe('/lesson/italian-game');
  expect(useProgressStore.getState().lessonProgress.sessions[key]).toEqual(restartLesson(session));
  expect(useProgressStore.getState().lessonProgress.sessions[key]).toMatchObject({
    ply: 0,
    usedHelp: true,
    mistakes: 2,
  });
  expect(screen.getByText('From memory')).toBeOnTheScreen();
  const branch = branchForGuide('italian-game', 'main')!;
  for (let ply = 0; ply < branch.moves.length; ply += 2) await move(branch.moves[ply]);
  expect(useProgressStore.getState().lessonProgress.attempts.at(-1)?.independent).toBe(false);
});

it('opens a due Home review in recall mode and records revisiting the demonstration as help', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const branch = branchForGuide('italian-game', 'main')!;
  let completed = beginLesson('italian-game', 'branch', 'main', [], yesterday)!;
  for (let ply = 0; ply < branch.moves.length; ply += 2)
    completed = answerLesson(completed, branch.moves[ply]);
  const key = lessonKey('branch', 'italian-game', 'main');
  const prior = lessonAttempt(completed, yesterday);
  useProgressStore.setState({
    lessonProgress: {
      ...emptyProgress().lessonProgress,
      attempts: [prior],
      sessions: { [key]: completed },
    },
  });
  const app = await renderApp();
  await fireEvent.press(screen.getByRole('button', { name: 'Review lesson' }));
  expect(app.getPathname()).toBe('/lesson/italian-game');
  expect(screen.getByText('From memory')).toBeOnTheScreen();
  expect(screen.queryByText(branch.notes[0])).not.toBeOnTheScreen();
  expect(useProgressStore.getState().lessonProgress.sessions[key].id).not.toBe(completed.id);
  expect(useProgressStore.getState().lessonProgress.sessions[key].usedHelp).toBe(false);
  await fireEvent.press(screen.getByRole('button', { name: 'Watch' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Play' }));
  for (let ply = 0; ply < branch.moves.length; ply += 2) await move(branch.moves[ply]);
  expect(useProgressStore.getState().lessonProgress.attempts.at(-1)?.independent).toBe(false);
});

it('holds back Home actions until saved progress is restored', async () => {
  useProgressStore.setState({ hydrated: false });
  await renderApp();
  const button = screen.getByRole('button', { name: 'Loading…' });
  expect(button).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Start lesson' })).not.toBeOnTheScreen();
  await fireEvent.press(button);
  expect(useProgressStore.getState().currentSession).toBeNull();
  expect(useProgressStore.getState().lessonProgress).toEqual(emptyProgress().lessonProgress);
});

it('updates Home recommendations when a mounted screen crosses local midnight', async () => {
  jest.useFakeTimers();
  try {
    const beforeMidnight = new Date(2026, 9, 27, 23, 59, 59);
    jest.setSystemTime(beforeMidnight);
    useProgressStore.setState({
      lessonProgress: {
        ...emptyProgress().lessonProgress,
        attempts: [
          {
            id: 'today-guided',
            guideId: 'italian-game',
            kind: 'branch',
            targetId: 'main',
            independent: false,
            dateKey: dateKey(beforeMidnight),
            completedAt: beforeMidnight.toISOString(),
          },
        ],
      },
    });
    await renderApp();
    expect(screen.getByRole('button', { name: 'Try a new position' })).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('button', { name: 'Review lesson' })).toBeOnTheScreen();
  } finally {
    await cleanup();
    jest.useRealTimers();
  }
});

it('welcomes a new player, asks for a level once, then starts practice at that level', async () => {
  useProgressStore.setState({ level: null });
  const app = await renderApp();
  expect(app.getPathname()).toBe('/welcome');
  await fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
  await fireEvent.press(screen.getByRole('button', { name: /^Easy:/ }));
  expect(app.getPathname()).toBe('/');
  expect(useProgressStore.getState().level).toBe(2);
  expect(screen.getByText('Your first puzzles')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Start puzzles' }));
  expect(app.getPathname()).toBe('/workout');
  expect(screen.getByText('Tap or drag a piece to move.')).toBeOnTheScreen();
  const ids = useProgressStore.getState().currentSession!.puzzleIds;
  expect(ids.map((id) => puzzleById[id].level)).toEqual([1, 2, 2, 2, 3]);
});

it('clears a skill round with four independent solves and records it', async () => {
  const app = await renderApp('/skill/fork');
  expect(screen.getByText(skillById.fork.lookFor)).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Start warm-up' }));
  expect(app.getPathname()).toBe('/workout');
  expect(screen.getByText(/Puzzle 1 of 5 · Forks · Warm-up/)).toBeOnTheScreen();
  for (let index = 0; index < 5; index += 1) {
    const session = useProgressStore.getState().currentSession!;
    const puzzle = puzzleById[session.puzzleIds[index]];
    expect(puzzle.themes).toContain('fork');
    if (index === 0) await fireEvent.press(screen.getByRole('button', { name: 'Hint' }));
    for (let ply = 0; ply < puzzle.moves.length; ply += 2) await move(puzzle.moves[ply]);
    await fireEvent.press(
      screen.getByRole('button', { name: index === 4 ? 'See results' : 'Next puzzle' }),
    );
  }
  expect(app.getPathname()).toBe('/result');
  expect(screen.getByText('Round passed!')).toBeOnTheScreen();
  expect(screen.getByText('4 / 5')).toBeOnTheScreen();
  expect(useProgressStore.getState().skillProgress[1]?.fork).toEqual({ cleared: [1], runs: 1 });
  await fireEvent.press(screen.getByRole('button', { name: 'Next: at your level' }));
  expect(app.getPathname()).toBe('/workout');
  expect(screen.getByText('Find the best move')).toBeOnTheScreen();
});

it('hides openings from the tabs, Home and Progress while they are switched off', async () => {
  mockShowOpenings = false;
  await renderApp();
  expect(screen.getByRole('button', { name: /^Learn, tab/ })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: /^Openings, tab/ })).toBeNull();
  expect(screen.queryByText('Openings')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: /^Progress, tab/ }));
  expect(screen.getByText('Current streak')).toBeOnTheScreen();
  expect(screen.queryByText('Guides practiced')).toBeNull();
});

it('moves between tabs and returns to the starting tab after a round', async () => {
  const app = await renderApp();
  await fireEvent.press(screen.getByRole('button', { name: /^Openings, tab/ }));
  expect(app.getPathname()).toBe('/openings');
  await fireEvent.press(screen.getByRole('button', { name: /^Learn, tab/ }));
  expect(app.getPathname()).toBe('/learn');
  await fireEvent.press(screen.getByRole('button', { name: /^Puzzles, tab/ }));
  expect(app.getPathname()).toBe('/puzzles');
  await fireEvent.press(screen.getByRole('button', { name: 'Forks: 0 of 3 rounds passed' }));
  expect(app.getPathname()).toBe('/skill/fork');
  await fireEvent.press(screen.getByRole('button', { name: 'Start warm-up' }));
  for (let index = 0; index < 5; index += 1) {
    const session = useProgressStore.getState().currentSession!;
    const puzzle = puzzleById[session.puzzleIds[index]];
    for (let ply = 0; ply < puzzle.moves.length; ply += 2) await move(puzzle.moves[ply]);
    await fireEvent.press(
      screen.getByRole('button', { name: index === 4 ? 'See results' : 'Next puzzle' }),
    );
  }
  expect(screen.getByText('Round passed!')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(app.getPathname()).toBe('/puzzles');
  // Skill progress belongs to the level it was earned at.
  expect(screen.getByRole('button', { name: 'Forks: 1 of 3 rounds passed' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Change' }));
  await fireEvent.press(screen.getByRole('button', { name: /^Expert:/ }));
  expect(app.getPathname()).toBe('/puzzles');
  expect(screen.getByRole('button', { name: 'Forks: 0 of 3 rounds passed' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Change' }));
  await fireEvent.press(screen.getByRole('button', { name: /^Beginner:/ }));
  expect(screen.getByRole('button', { name: 'Forks: 1 of 3 rounds passed' })).toBeOnTheScreen();
});

it('switches the unstarted puzzles of a round in progress when the level changes', async () => {
  const app = await renderApp();
  await fireEvent.press(screen.getByRole('button', { name: 'Start puzzles' }));
  expect(screen.getByText('Puzzle 1 of 5 · Beginner')).toBeOnTheScreen();
  const first = useProgressStore.getState().currentSession!;
  const puzzle = puzzleById[first.puzzleIds[0]];
  for (let ply = 0; ply < puzzle.moves.length; ply += 2) await move(puzzle.moves[ply]);
  await fireEvent.press(screen.getByRole('button', { name: 'Next puzzle' }));
  await act(() => router.back());
  await fireEvent.press(screen.getByRole('button', { name: /^Puzzles, tab/ }));
  await fireEvent.press(screen.getByRole('button', { name: 'Change' }));
  expect(screen.getByText(/haven't started in your current round will switch/)).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: /^Expert:/ }));
  const session = useProgressStore.getState().currentSession!;
  expect(session.puzzleIds[0]).toBe(puzzle.id);
  expect(session.puzzleIds.slice(1).map((id) => puzzleById[id].level)).toEqual([4, 5, 5, 5]);
  await fireEvent.press(screen.getByRole('button', { name: 'Resume puzzles' }));
  expect(app.getPathname()).toBe('/workout');
  expect(screen.getByText('Puzzle 2 of 5 · Hard')).toBeOnTheScreen();
});

it('plays a timed square trainer round and saves the score', async () => {
  jest.useFakeTimers({ now: new Date('2026-10-28T10:00:00Z') });
  try {
    await renderApp('/vision');
    await fireEvent.press(screen.getByRole('button', { name: 'Start round' }));
    for (let found = 0; found < 3; found += 1) {
      const prompt = screen.getByText(/^[a-h][1-8]$/);
      await fireEvent.press(screen.getByTestId(`vision-${prompt.props.children}`));
    }
    expect(screen.getByText('3 found')).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(31_000);
    });
    expect(screen.getByText('3 squares found.')).toBeOnTheScreen();
    expect(useProgressStore.getState().visionScores.w).toEqual([3]);
  } finally {
    await act(async () => {
      cleanup();
    });
    jest.useRealTimers();
  }
});

it('shows theme strengths and weaknesses on Progress', async () => {
  const forks = puzzles.filter((puzzle) => puzzle.themes.join() === 'fork').slice(0, 5);
  const pins = puzzles.filter((puzzle) => puzzle.themes.join() === 'pin').slice(0, 5);
  const now = new Date();
  const attempts = [...forks, ...pins].map((puzzle, index) => ({
    id: `seed-${index}`,
    puzzleId: puzzle.id,
    independent: forks.includes(puzzle) || index === 5,
    dateKey: dateKey(now),
    completedAt: now.toISOString(),
  }));
  useProgressStore.setState({ attempts });
  await renderApp('/progress');
  expect(
    screen.getByLabelText(/^Forks: 100% solved without help in 5 puzzles, a strength$/),
  ).toBeOnTheScreen();
  expect(
    screen.getByLabelText(/^Pins: 20% solved without help in 5 puzzles, needs practice$/),
  ).toBeOnTheScreen();
});

describe('daily challenge', () => {
  async function solveCurrentPuzzle(label: 'Next puzzle' | 'See results') {
    const session = useProgressStore.getState().currentSession!;
    const puzzle = puzzleById[session.puzzleIds[session.index]];
    for (let ply = 0; ply < puzzle.moves.length; ply += 2) await move(puzzle.moves[ply]);
    await fireEvent.press(screen.getByRole('button', { name: label }));
  }

  it('plays a challenge with one hard pick, then scores and saves the run', async () => {
    const app = await renderApp();
    await fireEvent.press(screen.getByRole('button', { name: 'Open daily challenge' }));
    expect(app.getPathname()).toBe('/daily-route');
    await fireEvent.press(screen.getByRole('button', { name: 'Start challenge' }));
    expect(app.getPathname()).toBe('/workout');
    expect(screen.getByText(/^Puzzle 1 of 5/)).toBeOnTheScreen();
    const planned = useProgressStore.getState().currentSession!;

    await solveCurrentPuzzle('Next puzzle');
    expect(screen.getByText('Pick your next puzzle.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Choose a hard puzzle' }));
    expect(screen.getByText(/· Hard/)).toBeOnTheScreen();
    expect(useProgressStore.getState().currentSession!.puzzleIds[1]).toBe(
      planned.route!.steepIds[0],
    );
    await solveCurrentPuzzle('Next puzzle');
    await solveCurrentPuzzle('Next puzzle');
    await fireEvent.press(screen.getByRole('button', { name: 'Choose a normal puzzle' }));
    await solveCurrentPuzzle('Next puzzle');
    await solveCurrentPuzzle('See results');

    expect(app.getPathname()).toBe('/result');
    // Four normal puzzles at 2 points and one hard puzzle at 4.
    expect(screen.getByText('12 points')).toBeOnTheScreen();
    const state = useProgressStore.getState();
    expect(state.routeRuns).toEqual([{ dateKey: dateKey(), score: 12, steepTaken: 1, level: 1 }]);
    expect(state.attempts).toHaveLength(5);
    expect(state.completions.at(-1)?.mode).toBe('route');

    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByText('12 points today')).toBeOnTheScreen();
    expect(screen.getByLabelText('Practice streak: 1 day')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Start puzzles' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: "See today's challenge" }));
    expect(screen.queryByRole('button', { name: 'Start challenge' })).not.toBeOnTheScreen();
    expect(useProgressStore.getState().startRoute()).toBe(false);
  });

  it('gives nothing for a hard puzzle solved with help', async () => {
    useProgressStore.getState().startRoute();
    await renderApp('/workout');
    await solveCurrentPuzzle('Next puzzle');
    await fireEvent.press(screen.getByRole('button', { name: 'Choose a hard puzzle' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Hint' }));
    await solveCurrentPuzzle('Next puzzle');
    await solveCurrentPuzzle('Next puzzle');
    await fireEvent.press(screen.getByRole('button', { name: 'Choose a normal puzzle' }));
    await solveCurrentPuzzle('Next puzzle');
    await solveCurrentPuzzle('See results');
    expect(screen.getByText('8 points')).toBeOnTheScreen();
  });

  it('resumes a saved challenge at a pick after storage reload', async () => {
    useProgressStore.getState().startRoute();
    await renderApp('/workout');
    await solveCurrentPuzzle('Next puzzle');
    await flushProgressWrites();
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    await act(async () => {
      useProgressStore.setState(emptyProgress());
      await flushProgressWrites();
      await AsyncStorage.setItem(PROGRESS_KEY, raw!);
      await useProgressStore.persist.rehydrate();
    });
    expect(useProgressStore.getState().currentSession?.route?.choosing).toBe(true);
    expect(useProgressStore.getState().storageIssue).toBe(false);
    expect(screen.getByRole('button', { name: 'Choose a normal puzzle' })).toBeOnTheScreen();
  });

  it('asks a new player for a level before the first challenge', async () => {
    useProgressStore.setState({ level: null });
    const app = await renderApp('/daily-route');
    await fireEvent.press(screen.getByRole('button', { name: 'Start challenge' }));
    expect(app.getPathname()).toBe('/level');
    await fireEvent.press(screen.getByRole('button', { name: /^Medium:/ }));
    expect(app.getPathname()).toBe('/workout');
    const session = useProgressStore.getState().currentSession!;
    expect(session.mode).toBe('route');
    expect(session.puzzleIds.every((id) => puzzleById[id].level === 3)).toBe(true);
  });

  it('asks the player to finish another round first', async () => {
    useProgressStore.getState().startPractice();
    const app = await renderApp('/daily-route');
    expect(screen.getByText(/Finish your current puzzles first/)).toBeOnTheScreen();
    expect(useProgressStore.getState().startRoute()).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: 'Resume puzzles' }));
    expect(app.getPathname()).toBe('/workout');
    expect(useProgressStore.getState().currentSession?.mode).toBe('daily');
  });
});

describe('settings', () => {
  it('opens from Home and saves appearance, pieces and haptics', async () => {
    const app = await renderApp();
    await fireEvent.press(screen.getByRole('button', { name: 'Settings' }));
    expect(app.getPathname()).toBe('/settings');
    await fireEvent.press(screen.getByRole('button', { name: 'Dark' }));
    expect(useProgressStore.getState().settings.appearance).toBe('dark');
    await fireEvent.press(screen.getByRole('button', { name: 'Modern pieces by philatype' }));
    expect(useProgressStore.getState().settings.pieceSet).toBe('modern');
    await fireEvent(screen.getByLabelText('Haptic feedback'), 'valueChange', false);
    expect(useProgressStore.getState().settings.haptics).toBe(false);
    await flushProgressWrites();
    const saved = JSON.parse((await AsyncStorage.getItem(PROGRESS_KEY))!);
    await fireEvent(screen.getByLabelText('Sound effects'), 'valueChange', false);
    await flushProgressWrites();
    const savedAgain = JSON.parse((await AsyncStorage.getItem(PROGRESS_KEY))!);
    expect(saved.state.settings.haptics).toBe(false);
    expect(savedAgain.state.settings).toEqual({
      appearance: 'dark',
      haptics: false,
      sounds: false,
      pieceSet: 'modern',
    });
  });

  it('applies the chosen appearance to the theme', async () => {
    useProgressStore.setState({
      settings: { ...useProgressStore.getState().settings, appearance: 'dark' },
    });
    const dark = await renderHook(() => useColorSchemeName());
    expect(dark.result.current).toBe('dark');
    await act(async () => {
      useProgressStore.setState({
        settings: { ...useProgressStore.getState().settings, appearance: 'light' },
      });
    });
    expect(dark.result.current).toBe('light');
  });
});

it('sends a new player straight to the first Learn lesson', async () => {
  useProgressStore.setState({ level: null });
  const app = await renderApp();
  await fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
  await fireEvent.press(screen.getByRole('button', { name: "I'm new to chess" }));
  expect(app.getPathname()).toBe('/course/goal-of-chess');
  expect(useProgressStore.getState().level).toBe(1);
  expect(screen.getByText(/Chess is a game for two players/)).toBeOnTheScreen();
});

it('plays a Learn lesson to stars and unlocks the next one', async () => {
  const app = await renderApp('/learn');
  expect(screen.getByRole('button', { name: 'Squares and their names, locked' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Start lesson: The goal of chess' }));
  expect(app.getPathname()).toBe('/course/goal-of-chess');
  const answers = ['White', 'Checkmate the king', 'Eight'];
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Black' }));
  await fireEvent.press(screen.getByRole('button', { name: answers[0] }));
  expect(screen.getByText('White always moves first.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await fireEvent.press(screen.getByTestId('square-g8'));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await fireEvent.press(screen.getByRole('button', { name: answers[1] }));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  for (const file of 'abcdefgh') await fireEvent.press(screen.getByTestId(`square-${file}2`));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await fireEvent.press(screen.getByRole('button', { name: answers[2] }));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await move('e2e4');
  await fireEvent.press(screen.getByRole('button', { name: 'Finish' }));
  expect(screen.getByText('Well done!')).toBeOnTheScreen();
  expect(screen.getByLabelText('2 of 3 stars')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(app.getPathname()).toBe('/learn');
  expect(screen.getByRole('button', { name: 'The goal of chess, 2 of 3 stars' })).toBeOnTheScreen();
  await fireEvent.press(
    screen.getByRole('button', { name: 'Start lesson: Squares and their names' }),
  );
  expect(app.getPathname()).toBe('/course/square-names');
});

it('starts a Learn lesson over from step 1 after leaving it, keeping finished slips', async () => {
  const app = await renderApp('/learn');
  await fireEvent.press(screen.getByRole('button', { name: 'Start lesson: The goal of chess' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Black' }));
  await fireEvent.press(screen.getByRole('button', { name: 'White' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(useProgressStore.getState().courseProgress.current).toMatchObject({ step: 2, slips: 1 });
  await act(() => router.back());
  expect(app.getPathname()).toBe('/learn');
  expect(useProgressStore.getState().courseProgress.current).toMatchObject({
    lessonId: 'goal-of-chess',
    step: 0,
    slips: 1,
  });
  await fireEvent.press(screen.getByRole('button', { name: 'Start lesson: The goal of chess' }));
  expect(screen.getByText(/Chess is a game for two players/)).toBeOnTheScreen();
});

it('checks taps on a Learn board and counts a finished lesson toward the streak', async () => {
  useProgressStore.getState().startCourse('goal-of-chess');
  const steps = courseLessonById['goal-of-chess'].lesson.steps.length;
  for (let step = 0; step < steps; step++) useProgressStore.getState().finishCourseStep(0);
  useProgressStore.getState().closeCourse();
  await renderApp('/learn');
  await fireEvent.press(
    screen.getByRole('button', { name: 'Start lesson: Squares and their names' }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await fireEvent.press(screen.getByTestId('square-d5'));
  expect(screen.getByText('That is d5.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('square-e4'));
  expect(screen.getByText('File e, rank 4.')).toBeOnTheScreen();
  await act(() => router.back());
  await fireEvent.press(screen.getByRole('button', { name: /^Home, tab/ }));
  expect(screen.getByLabelText('Practice streak: 1 day')).toBeOnTheScreen();
});

/** Marks every lesson before `lessonId` finished and opens it at `step`. */
function openCourseAt(lessonId: string, step: number) {
  const now = new Date();
  const before = courseLessons.slice(0, courseLessonById[lessonId].index);
  useProgressStore.setState({
    courseProgress: {
      results: before.map((entry) => ({
        id: entry.lesson.id,
        lessonId: entry.lesson.id,
        stars: 3 as const,
        dateKey: dateKey(now),
        completedAt: now.toISOString(),
      })),
      current: { lessonId, step, slips: 0 },
    },
  });
}
// Router tests run on fake timers; replies wait on a zero-length timer when motion is off.
const replyPause = () =>
  act(() => {
    jest.advanceTimersByTime(1);
  });

it('plays a Learn line with a scripted reply, counting a hint as a mistake', async () => {
  openCourseAt('forks', 1);
  await renderApp('/course/forks');
  await fireEvent.press(screen.getByRole('button', { name: 'Hint' }));
  expect(screen.getByText('Find a knight check that also hits a8.')).toBeOnTheScreen();
  await move('b5c7');
  await replyPause();
  await move('c7a8');
  expect(screen.getByText('The king had to move, so the rook fell.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(useProgressStore.getState().courseProgress.current).toMatchObject({ step: 2, slips: 1 });
});

it('solves the bundled puzzles inside a Learn lesson', async () => {
  openCourseAt('queen-mates-close', 2);
  await renderApp('/course/queen-mates-close');
  const step = courseLessonById['queen-mates-close'].lesson.steps[2];
  if (step.kind !== 'puzzles') throw new Error('Expected a puzzle step');
  const list = coursePuzzles(step, 0);
  for (const [index, puzzle] of list.entries()) {
    expect(screen.getByText(`Puzzle ${index + 1} of ${list.length}`)).toBeOnTheScreen();
    for (let ply = 0; ply < puzzle.moves.length; ply += 2) {
      await move(puzzle.moves[ply]);
      await replyPause();
    }
    if (index < list.length - 1)
      await fireEvent.press(screen.getByRole('button', { name: 'Next puzzle' }));
  }
  await fireEvent.press(screen.getByRole('button', { name: 'Finish' }));
  expect(screen.getByText('Perfect!')).toBeOnTheScreen();
});
