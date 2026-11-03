import { courseLessonById, courseLessons, type CourseEntry } from '@/content/course';

export type Stars = 1 | 2 | 3;

export interface CourseResult {
  id: string;
  lessonId: string;
  stars: Stars;
  dateKey: string;
  completedAt: string;
}

export type LessonStatus = 'done' | 'next' | 'locked';

/** The best stars earned on each finished lesson. */
export function bestStars(results: readonly CourseResult[]) {
  const best: Record<string, Stars> = {};
  for (const result of results) {
    if (!courseLessonById[result.lessonId]) continue;
    best[result.lessonId] = Math.max(best[result.lessonId] ?? 0, result.stars) as Stars;
  }
  return best;
}

/** The first unfinished lesson on the path, or undefined once every lesson is done. */
export function nextCourseLesson(best: Record<string, Stars>): CourseEntry | undefined {
  return courseLessons.find((entry) => !best[entry.lesson.id]);
}

/** Lessons unlock in order: a finished lesson can be replayed, and only the first unfinished one opens. */
export function lessonStatus(lessonId: string, best: Record<string, Stars>): LessonStatus {
  if (best[lessonId]) return 'done';
  return nextCourseLesson(best)?.lesson.id === lessonId ? 'next' : 'locked';
}

export function sectionFinished(sectionId: string, best: Record<string, Stars>) {
  const lessons = courseLessons.filter((entry) => entry.section.id === sectionId);
  return lessons.length > 0 && lessons.every((entry) => best[entry.lesson.id]);
}

/** Stars and lessons finished for a group of lessons, such as a unit. */
export function starTotals(lessonIds: readonly string[], best: Record<string, Stars>) {
  return {
    stars: lessonIds.reduce((total, id) => total + (best[id] ?? 0), 0),
    finished: lessonIds.filter((id) => best[id]).length,
  };
}

/** No slips gives three stars, one or two give two, more give one. */
export function starsForSlips(slips: number): Stars {
  if (slips === 0) return 3;
  return slips <= 2 ? 2 : 1;
}
