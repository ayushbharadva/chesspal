import { activityStreak, bestActivityStreak, dateKey, relativeDay } from '@/utils/date-key';

it('handles local days, month and year boundaries', () => {
  expect(dateKey(new Date(2026, 0, 1, 0, 1))).toBe('2026-01-01');
  expect(activityStreak(['2025-12-30', '2025-12-31', '2026-01-01'], '2026-01-01')).toBe(3);
  expect(activityStreak(['2026-02-28', '2026-03-01'], '2026-03-02')).toBe(2);
});
it('counts a day once, tolerates future dates and preserves the best streak', () => {
  const days = ['2026-10-10', '2026-10-10', '2026-10-11', '2026-10-13', '2026-10-20'];
  expect(activityStreak(days, '2026-10-13')).toBe(1);
  expect(activityStreak(days, '2026-10-15')).toBe(0);
  expect(bestActivityStreak(days)).toBe(2);
});
it('describes a due date relative to today', () => {
  expect(relativeDay('2026-11-03', '2026-11-03')).toBe('today');
  expect(relativeDay('2026-11-04', '2026-11-03')).toBe('tomorrow');
  expect(relativeDay('2026-12-01', '2026-11-28')).toBe('in 3 days');
});
