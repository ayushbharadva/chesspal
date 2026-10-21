import { puzzleById } from '@/content';
import { type Attempt } from '@/progress/types';
import { dateKey } from '@/utils/date-key';

const reviewIntervals = [1, 3, 7, 14, 30];

export interface PuzzleReview {
  puzzleId: string;
  dueDate: string;
  intervalIndex: number;
  lastRecallDate: string;
  lastAttempt: Attempt;
}

function afterDays(localDate: string, days: number) {
  const [year, month, day] = localDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function reviewSchedule(attempts: Attempt[]) {
  const schedule = new Map<string, PuzzleReview>();
  const chronological = [...attempts].sort(
    (first, second) => Date.parse(first.completedAt) - Date.parse(second.completedAt),
  );
  for (const attempt of chronological) {
    const previous = schedule.get(attempt.puzzleId);
    if (!previous || !attempt.independent) {
      schedule.set(attempt.puzzleId, {
        puzzleId: attempt.puzzleId,
        dueDate: afterDays(attempt.dateKey, reviewIntervals[0]),
        intervalIndex: 0,
        lastRecallDate: attempt.dateKey,
        lastAttempt: attempt,
      });
    } else if (attempt.dateKey > previous.lastRecallDate && attempt.dateKey >= previous.dueDate) {
      const intervalIndex = Math.min(previous.intervalIndex + 1, reviewIntervals.length - 1);
      schedule.set(attempt.puzzleId, {
        puzzleId: attempt.puzzleId,
        dueDate: afterDays(attempt.dateKey, reviewIntervals[intervalIndex]),
        intervalIndex,
        lastRecallDate: attempt.dateKey,
        lastAttempt: attempt,
      });
    } else {
      schedule.set(attempt.puzzleId, { ...previous, lastAttempt: attempt });
    }
  }
  return schedule;
}

export function reviewQueue(attempts: Attempt[], localDate = dateKey()) {
  return [...reviewSchedule(attempts).values()]
    .filter(
      (review) =>
        puzzleById[review.puzzleId] &&
        (review.dueDate <= localDate || !review.lastAttempt.independent),
    )
    .sort(
      (first, second) =>
        first.dueDate.localeCompare(second.dueDate) ||
        Date.parse(first.lastAttempt.completedAt) - Date.parse(second.lastAttempt.completedAt) ||
        first.puzzleId.localeCompare(second.puzzleId),
    );
}
