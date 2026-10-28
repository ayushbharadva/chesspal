import { practiceDates } from '@/progress/activity';
import { type Completion, type LessonAttempt } from '@/progress/types';
import { activityStreak, bestActivityStreak } from '@/utils/date-key';

function lesson(day: string): LessonAttempt {
  return {
    id: day,
    guideId: 'italian-game',
    kind: 'branch',
    targetId: 'main',
    dateKey: day,
    completedAt: `${day}T10:00:00Z`,
    independent: false,
  };
}
function workout(day: string): Completion {
  return { id: day, dateKey: day, total: 10, independent: 5, mode: 'daily' };
}
it('includes guided lessons and exercises and counts a mixed practice day only once', () => {
  const completions = [workout('2026-10-25'), workout('2026-10-26')];
  const lessons: LessonAttempt[] = [
    lesson('2026-10-26'),
    { ...lesson('2026-10-27'), kind: 'transfer' },
    lesson('2026-10-27'),
  ];
  const dates = practiceDates(completions, lessons);
  expect(dates).toEqual(['2026-10-25', '2026-10-26', '2026-10-27']);
  expect(activityStreak(dates, '2026-10-27')).toBe(3);
  expect(bestActivityStreak(dates)).toBe(3);
  expect(completions).toHaveLength(2);
  expect(lessons).toHaveLength(3);
});
it('preserves workout-only history and has no activity until something is completed', () => {
  expect(practiceDates([], [])).toEqual([]);
  expect(practiceDates([workout('2026-10-26')], [])).toEqual(['2026-10-26']);
  expect(practiceDates([], [lesson('2026-10-27')])).toEqual(['2026-10-27']);
});
