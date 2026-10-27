import { type Completion, type LessonAttempt } from '@/progress/types';

export function practiceDates(completions: Completion[], lessons: LessonAttempt[]) {
  return [...new Set([...completions, ...lessons].map((item) => item.dateKey))].sort();
}
