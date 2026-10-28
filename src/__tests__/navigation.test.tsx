import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, cleanup, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { guideById, puzzleById, puzzles } from '@/content';
import { skillById } from '@/content/skills';
import { branchForGuide, transfersForGuide } from '@/content/lessons';
import { answerLesson, beginLesson, lessonAttempt, lessonKey } from '@/learning/lesson';
import { describeMove, INITIAL_POSITION } from '@/chess';
import { useProgressStore } from '@/progress/store';
import { emptyProgress } from '@/progress/types';
import { flushProgressWrites, PROGRESS_KEY } from '@/storage/storage';
import { dateKey } from '@/utils/date-key';
import { reviewQueue, reviewSchedule } from '@/workout/review';

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
  await flushProgressWrites();
  await AsyncStorage.clear();
  await useProgressStore.persist.rehydrate();
  useProgressStore.setState({
    ...emptyProgress(),
    level: 1,
    hydrated: true,
    storageIssue: false,
    lessonNotice: null,
  });
});
afterEach(async () => {
  await flushProgressWrites();
});

it('completes ten real puzzles, shows results and allows more practice', async () => {
  const app = await renderApp();
  await fireEvent.press(screen.getByRole('button', { name: 'Start practice' }));
  expect(app.getPathname()).toBe('/workout');
  expect(screen.getByText('Puzzle 1 of 10')).toBeOnTheScreen();
  for (let index = 0; index < 10; index += 1) {
    const session = useProgressStore.getState().currentSession!;
    const puzzle = puzzleById[session.puzzleIds[index]];
    for (let ply = 0; ply < puzzle.moves.length; ply += 2) await move(puzzle.moves[ply]);
    await fireEvent.press(
      screen.getByRole('button', { name: index === 9 ? 'See results' : 'Next puzzle' }),
    );
  }
  expect(app.getPathname()).toBe('/result');
  expect(screen.getByText('10 / 10')).toBeOnTheScreen();
  expect(useProgressStore.getState().attempts).toHaveLength(10);
  await fireEvent.press(screen.getByRole('button', { name: 'Keep practicing' }));
  expect(app.getPathname()).toBe('/workout');
  expect(useProgressStore.getState().currentSession!.mode).toBe('extra');
});

it('records solution replay as assisted and keeps completion idempotent', async () => {
  await renderApp();
  await fireEvent.press(screen.getByRole('button', { name: 'Start practice' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Show solution' }));
  while (useProgressStore.getState().currentSession?.phase === 'replay')
    await fireEvent.press(screen.getByRole('button', { name: 'Show next move' }));
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
    JSON.stringify({ version: 1, state: { ...emptyProgress(), attempts: [previousAttempt] } }),
  );
  await useProgressStore.persist.rehydrate();
  const app = await renderApp();
  expect(screen.getByText(/including ones you solved without help/)).toBeOnTheScreen();
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
    useProgressStore.setState(emptyProgress());
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
    await fireEvent.press(screen.getByRole('button', { name: 'Play line' }));
    const guide = guideById[id];
    for (let ply = guide.side === 'b' ? 1 : 0; ply < guide.moves.length; ply += 2)
      await move(guide.moves[ply]);
    expect(useProgressStore.getState().guideProgress[id].completedAt).not.toBeNull();
    expect(screen.getByText('Line practiced')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Back to Learn' }));
    expect(screen.getByText('Learn the ideas.')).toBeOnTheScreen();
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
  await fireEvent.press(screen.getByRole('button', { name: 'Your progress' }));
  expect(app.getPathname()).toBe('/progress');
  expect(screen.getByLabelText('Puzzles completed: 0')).toBeOnTheScreen();
});

it('fades branch help, preserves an interrupted recall and records retries honestly', async () => {
  await renderApp('/lesson/italian-game');
  const branch = branchForGuide('italian-game', 'evans-gambit')!;
  await fireEvent.press(screen.getByRole('button', { name: `Choose ${branch.title}` }));
  await fireEvent.press(screen.getByRole('button', { name: 'Play line' }));
  expect(screen.getByText('GUIDED PRACTICE · WITH HELP')).toBeOnTheScreen();
  expect(screen.getByText(describeMove(INITIAL_POSITION, branch.moves[0]))).toBeOnTheScreen();
  for (let ply = 0; ply < branch.moves.length; ply += 2) await move(branch.moves[ply]);
  expect(useProgressStore.getState().lessonProgress.attempts.at(-1)?.independent).toBe(false);
  await fireEvent.press(screen.getByRole('button', { name: 'Recall line without help' }));
  expect(screen.getByText('RECALL · TRY WITHOUT HELP')).toBeOnTheScreen();
  expect(screen.queryByText(describeMove(INITIAL_POSITION, branch.moves[0]))).not.toBeOnTheScreen();
  expect(screen.queryByText(branch.notes[0])).not.toBeOnTheScreen();
  await move('g1h3');
  expect(screen.getByText(/not necessarily a bad chess move/)).toBeOnTheScreen();
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
    ply: 2,
    mistakes: 1,
    scaffold: 'recall',
  });
  for (let ply = 2; ply < branch.moves.length; ply += 2) await move(branch.moves[ply]);
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
  await fireEvent.press(screen.getByRole('button', { name: 'Play line' }));
  for (const ply of [0, 2, 4, 6]) await move(alternate.moves[ply]);
  expect(useProgressStore.getState().lessonProgress.selected['italian-game']).toBe(alternateKey);
  expect(useProgressStore.getState().lessonProgress.sessions[alternateKey]).toMatchObject({
    targetId: 'evans-gambit',
    ply: 8,
  });
  await fireEvent.press(screen.getByRole('button', { name: 'Choose Main example' }));
  expect(screen.getByText(main.description)).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Play line' }));
  expect(useProgressStore.getState().lessonProgress.sessions[mainKey]).toMatchObject({
    targetId: 'main',
    ply: 6,
  });
  for (let ply = 6; ply < main.moves.length; ply += 2) await move(main.moves[ply]);
  expect(useProgressStore.getState().lessonProgress.attempts.at(-1)?.targetId).toBe('main');
  expect(useProgressStore.getState().lessonProgress.sessions[alternateKey].ply).toBe(8);
  await fireEvent.press(screen.getByRole('button', { name: `Choose ${alternate.title}` }));
  await fireEvent.press(screen.getByRole('button', { name: 'Play line' }));
  for (let ply = 8; ply < alternate.moves.length; ply += 2) await move(alternate.moves[ply]);
  expect(
    useProgressStore.getState().lessonProgress.attempts.map((attempt) => attempt.targetId),
  ).toEqual(['main', 'evans-gambit']);
});

it('explains a saved-branch resume and preserves both interrupted attempts', async () => {
  const now = new Date();
  const mainKey = lessonKey('branch', 'italian-game', 'main');
  const alternateKey = lessonKey('branch', 'italian-game', 'evans-gambit');
  const alternate = branchForGuide('italian-game', 'evans-gambit')!;
  let guided = beginLesson('italian-game', 'branch', 'evans-gambit', [], now)!;
  for (let ply = 0; ply < alternate.moves.length; ply += 2)
    guided = answerLesson(guided, alternate.moves[ply]);
  const first = lessonAttempt(guided, now);
  let saved = beginLesson('italian-game', 'branch', 'evans-gambit', [first], now)!;
  for (const ply of [0, 2, 4, 6, 8]) saved = answerLesson(saved, alternate.moves[ply]);
  saved = { ...saved, usedHelp: true, hintShown: true, mistakes: 2 };
  let main = beginLesson('italian-game', 'branch', 'main', [], now)!;
  for (const ply of [0, 2, 4]) main = answerLesson(main, alternate.moves[ply]);
  useProgressStore.setState({
    lessonProgress: {
      ...emptyProgress().lessonProgress,
      attempts: [first],
      sessions: { [mainKey]: main, [alternateKey]: saved },
      selected: { 'italian-game': mainKey },
    },
  });
  await renderApp('/lesson/italian-game');
  await move('b2b4');
  expect(screen.getByText(/Resuming your saved Evans Gambit/)).toBeOnTheScreen();
  expect(useProgressStore.getState().lessonProgress.sessions[mainKey]).toEqual(main);
  expect(useProgressStore.getState().lessonProgress.sessions[alternateKey]).toEqual(saved);
  expect(useProgressStore.getState().lessonProgress.attempts).toEqual([first]);
  await move(alternate.moves[10]);
  expect(useProgressStore.getState().lessonProgress.attempts.at(-1)?.independent).toBe(false);
});

it('tests a separate position, reveals its explanation after answering and tracks optional help', async () => {
  await renderApp('/lesson/italian-game');
  const exercise = transfersForGuide('italian-game')[0];
  await fireEvent.press(screen.getByRole('button', { name: `Try ${exercise.title}` }));
  expect(screen.queryByText(exercise.explanation)).not.toBeOnTheScreen();
  await move(exercise.answers[0]);
  expect(screen.getByText(exercise.explanation)).toBeOnTheScreen();
  expect(screen.getByText('Solved independently, without hints or retries.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Try idea without help' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Show idea hint' }));
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
  const app = await renderApp('/learn');
  await fireEvent.press(screen.getByRole('button', { name: 'Review Italian Game: Main example' }));
  expect(app.getPathname()).toBe('/lesson/italian-game');
  expect(screen.getByText('RECALL · TRY WITHOUT HELP')).toBeOnTheScreen();
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
  const app = await renderApp('/learn');
  expect(
    screen.getByRole('button', { name: 'Review Italian Game: Main example' }),
  ).toBeOnTheScreen();
  await fireEvent.press(
    screen.getByRole('button', { name: 'Review Caro-Kann Defence: Main example' }),
  );
  expect(app.getPathname()).toBe('/lesson/caro-kann');
  expect(screen.getByText('Caro-Kann Defence')).toBeOnTheScreen();
});

it('connects Home to a demonstration, related application and lesson-only activity', async () => {
  const app = await renderApp();
  await fireEvent.press(screen.getByRole('button', { name: 'Learn this line' }));
  expect(app.getPathname()).toBe('/lesson/italian-game');
  expect(screen.getByText('Move 0 of 12')).toBeOnTheScreen();
  expect(useProgressStore.getState().lessonProgress.attempts).toEqual([]);
  expect(useProgressStore.getState().lessonProgress.sessions).toEqual({});
  await fireEvent.press(screen.getByRole('button', { name: 'Play line' }));
  const branch = branchForGuide('italian-game', 'main')!;
  for (let ply = 0; ply < branch.moves.length; ply += 2) await move(branch.moves[ply]);
  await act(() => router.back());
  expect(app.getPathname()).toBe('/');
  expect(screen.getByText('1 day of practice')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Start practice' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Apply this idea' }));
  const exercise = transfersForGuide('italian-game')[0];
  expect(screen.getByText(exercise.prompt)).toBeOnTheScreen();
  expect(screen.queryByText(exercise.explanation)).not.toBeOnTheScreen();
  await move(exercise.answers[0]);
  expect(screen.getByText('Solved independently, without hints or retries.')).toBeOnTheScreen();
  await act(() => router.back());
  expect(screen.getByText('1 day of practice')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Your progress' }));
  expect(screen.getByLabelText('Workouts completed: 0')).toBeOnTheScreen();
  expect(screen.getByLabelText('Current practice streak: 1 day')).toBeOnTheScreen();
  expect(screen.getByLabelText('New positions solved independently: 1')).toBeOnTheScreen();
});

it('resumes an interrupted recalled lesson from Home after storage reload without resetting help', async () => {
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
  await fireEvent.press(screen.getByRole('button', { name: 'Resume lesson' }));
  expect(app.getPathname()).toBe('/lesson/italian-game');
  expect(useProgressStore.getState().lessonProgress.sessions[key]).toEqual(session);
  expect(screen.getByText('RECALL · TRY WITHOUT HELP')).toBeOnTheScreen();
  const branch = branchForGuide('italian-game', 'main')!;
  for (let ply = session.ply; ply < branch.moves.length; ply += 2) await move(branch.moves[ply]);
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
  await fireEvent.press(screen.getByRole('button', { name: 'Recall this lesson' }));
  expect(app.getPathname()).toBe('/lesson/italian-game');
  expect(screen.getByText('RECALL · TRY WITHOUT HELP')).toBeOnTheScreen();
  expect(screen.queryByText(branch.notes[0])).not.toBeOnTheScreen();
  expect(useProgressStore.getState().lessonProgress.sessions[key].id).not.toBe(completed.id);
  expect(useProgressStore.getState().lessonProgress.sessions[key].usedHelp).toBe(false);
  await fireEvent.press(screen.getByRole('button', { name: 'Learn line' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Play line' }));
  for (let ply = 0; ply < branch.moves.length; ply += 2) await move(branch.moves[ply]);
  expect(useProgressStore.getState().lessonProgress.attempts.at(-1)?.independent).toBe(false);
});

it('keeps the recommended lesson disabled until saved progress is restored', async () => {
  useProgressStore.setState({ hydrated: false });
  await renderApp();
  const button = screen.getByRole('button', { name: 'Restoring your lessons…' });
  expect(button).toBeDisabled();
  await fireEvent.press(button);
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
    expect(screen.getByRole('button', { name: 'Apply this idea' })).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('button', { name: 'Recall this lesson' })).toBeOnTheScreen();
  } finally {
    await cleanup();
    jest.useRealTimers();
  }
});

it('asks a new player for a level once, then starts practice at that level', async () => {
  useProgressStore.setState({ level: null });
  const app = await renderApp();
  await fireEvent.press(screen.getByRole('button', { name: 'Start practice' }));
  expect(app.getPathname()).toBe('/level');
  await fireEvent.press(screen.getByRole('button', { name: /^Easy:/ }));
  expect(app.getPathname()).toBe('/workout');
  expect(useProgressStore.getState().level).toBe(2);
  const ids = useProgressStore.getState().currentSession!.puzzleIds;
  expect(ids.map((id) => puzzleById[id].level)).toEqual([1, 1, 2, 2, 2, 2, 2, 2, 3, 3]);
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
    if (index === 0) await fireEvent.press(screen.getByRole('button', { name: 'Get a hint' }));
    for (let ply = 0; ply < puzzle.moves.length; ply += 2) await move(puzzle.moves[ply]);
    await fireEvent.press(
      screen.getByRole('button', { name: index === 4 ? 'See results' : 'Next puzzle' }),
    );
  }
  expect(app.getPathname()).toBe('/result');
  expect(screen.getByText('Round cleared.')).toBeOnTheScreen();
  expect(screen.getByText('4 / 5')).toBeOnTheScreen();
  expect(useProgressStore.getState().skillProgress.fork).toEqual({ cleared: [1], runs: 1 });
  await fireEvent.press(screen.getByRole('button', { name: 'Next: at your level' }));
  expect(app.getPathname()).toBe('/workout');
  expect(screen.getByText('Find the best move')).toBeOnTheScreen();
});

it('plays a timed board vision round and saves the score', async () => {
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
    screen.getByLabelText(/^Pins: 20% solved without help in 5 puzzles, worth practicing$/),
  ).toBeOnTheScreen();
});
