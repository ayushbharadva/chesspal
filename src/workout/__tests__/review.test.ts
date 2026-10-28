import { puzzles } from '@/content';
import { emptyProgress, type Attempt, type SavedProgress } from '@/progress/types';
import { decodeProgress } from '@/storage/schema';
import { reviewQueue, reviewSchedule } from '@/workout/review';

const puzzleId = puzzles[0].id;
function attempt(localDate: string, independent = true, id = puzzleId, hour = '10'): Attempt {
  return {
    id: `${id}-${localDate}-${hour}-${independent}`,
    puzzleId: id,
    dateKey: localDate,
    completedAt: `${localDate}T${hour}:00:00.000Z`,
    independent,
  };
}

it.each([true, false])(
  'schedules a first encounter for the next calendar day: %s',
  (independent) => {
    const attempts = [attempt('2026-12-31', independent)];
    expect(reviewSchedule(attempts).get(puzzleId)?.dueDate).toBe('2027-01-01');
    expect(reviewQueue(attempts, '2026-12-31')).toHaveLength(independent ? 0 : 1);
    expect(reviewQueue(attempts, '2027-01-01')).toHaveLength(1);
  },
);

it('advances independent recalls through 1, 3, 7, 14 and 30 calendar days, then stays at 30', () => {
  const attempts: Attempt[] = [];
  const dates = [
    '2026-10-01',
    '2026-10-02',
    '2026-10-05',
    '2026-10-12',
    '2026-10-26',
    '2026-11-25',
  ];
  const expectedDue = [
    '2026-10-02',
    '2026-10-05',
    '2026-10-12',
    '2026-10-26',
    '2026-11-25',
    '2026-12-25',
  ];
  for (const [index, localDate] of dates.entries()) {
    attempts.push(attempt(localDate));
    expect(reviewSchedule(attempts).get(puzzleId)).toMatchObject({
      dueDate: expectedDue[index],
      intervalIndex: Math.min(index, 4),
    });
  }
});

it('does not promote or postpone review for same-day or early independent practice', () => {
  const attempts = [
    attempt('2026-10-01'),
    attempt('2026-10-01', true, puzzleId, '12'),
    attempt('2026-10-02'),
    attempt('2026-10-02', true, puzzleId, '12'),
    attempt('2026-10-03'),
  ];
  expect(reviewSchedule(attempts).get(puzzleId)).toMatchObject({
    dueDate: '2026-10-05',
    intervalIndex: 1,
    lastRecallDate: '2026-10-02',
  });
  expect(reviewQueue(attempts, '2026-10-04')).toEqual([]);
  expect(reviewQueue(attempts, '2026-10-05')).toHaveLength(1);
});

it('resets after help and keeps a same-day correction scheduled for tomorrow', () => {
  const attempts = [attempt('2026-10-01'), attempt('2026-10-02'), attempt('2026-10-05')];
  attempts.push(attempt('2026-10-05', false, puzzleId, '12'));
  expect(reviewSchedule(attempts).get(puzzleId)).toMatchObject({
    dueDate: '2026-10-06',
    intervalIndex: 0,
  });
  expect(reviewQueue(attempts, '2026-10-05')).toHaveLength(1);
  attempts.push(attempt('2026-10-05', true, puzzleId, '13'));
  expect(reviewSchedule(attempts).get(puzzleId)).toMatchObject({
    dueDate: '2026-10-06',
    intervalIndex: 0,
  });
  expect(reviewQueue(attempts, '2026-10-05')).toEqual([]);
  attempts.push(attempt('2026-10-06'));
  expect(reviewSchedule(attempts).get(puzzleId)?.dueDate).toBe('2026-10-09');
});

it('derives review from legacy version-one history without altering the saved data', () => {
  const attempts = [attempt('2026-10-02'), attempt('2026-10-01')];
  const raw = JSON.stringify({ version: 1, state: { ...emptyProgress(), attempts } });
  const saved = decodeProgress(raw).state as SavedProgress;
  expect(reviewSchedule(saved.attempts).get(puzzleId)?.dueDate).toBe('2026-10-05');
  expect(JSON.stringify({ version: 1, state: saved })).toBe(raw);
});

it('queues unique eligible puzzles with the oldest due first and immediate retries afterward', () => {
  const attempts = [
    attempt('2026-10-10', true, puzzles[0].id),
    attempt('2026-10-12', true, puzzles[1].id),
    attempt('2026-10-14', false, puzzles[2].id),
    attempt('2026-10-14', false, puzzles[2].id, '12'),
    attempt('2026-10-14', true, puzzles[3].id),
    attempt('2026-10-10', true, 'removed-puzzle'),
  ];
  expect(reviewQueue(attempts, '2026-10-14').map((review) => review.puzzleId)).toEqual([
    puzzles[0].id,
    puzzles[1].id,
    puzzles[2].id,
  ]);
});

it('uses the recorded local day rather than the UTC completion day around midnight', () => {
  const attempts = [{ ...attempt('2026-10-21'), completedAt: '2026-10-20T20:00:00.000Z' }];
  expect(reviewSchedule(attempts).get(puzzleId)?.dueDate).toBe('2026-10-22');
  expect(reviewQueue(attempts, '2026-10-21')).toEqual([]);
  expect(reviewQueue(attempts, '2026-10-22')).toHaveLength(1);
});
