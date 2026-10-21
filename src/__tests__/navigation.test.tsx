import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { guideById, puzzleById } from '@/content';
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
  useProgressStore.setState({ ...emptyProgress(), hydrated: true, storageIssue: false });
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
