import { type CourseResult } from '@/course/path';
import { type Completion, type LessonAttempt } from '@/progress/types';

export function practiceDates(
  completions: Completion[],
  lessons: LessonAttempt[],
  courseResults: CourseResult[] = [],
) {
  return [
    ...new Set([...completions, ...lessons, ...courseResults].map((item) => item.dateKey)),
  ].sort();
}
