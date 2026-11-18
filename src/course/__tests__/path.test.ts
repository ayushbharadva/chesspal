import { courseLessons } from '@/content/course';
import {
  bestStars,
  lessonStatus,
  nextCourseLesson,
  restartCourseRun,
  sectionFinished,
  starsForSlips,
  starTotals,
  type CourseResult,
} from '@/course/path';

function result(lessonId: string, stars: 1 | 2 | 3, id = lessonId): CourseResult {
  return {
    id,
    lessonId,
    stars,
    dateKey: '2026-11-03',
    completedAt: '2026-11-03T10:00:00.000Z',
  };
}

const [first, second, third] = courseLessons.map((entry) => entry.lesson.id);

describe('course path', () => {
  it('opens only the first lesson for a new player', () => {
    expect(lessonStatus(first, {})).toBe('next');
    expect(lessonStatus(second, {})).toBe('locked');
    expect(nextCourseLesson({})?.lesson.id).toBe(first);
  });

  it('unlocks the next lesson once one is finished, and keeps finished ones open', () => {
    const best = bestStars([result(first, 2)]);
    expect(lessonStatus(first, best)).toBe('done');
    expect(lessonStatus(second, best)).toBe('next');
    expect(lessonStatus(third, best)).toBe('locked');
  });

  it('keeps the best stars across replays and ignores removed lessons', () => {
    const best = bestStars([
      result(first, 3, 'a'),
      result(first, 1, 'b'),
      result('removed-lesson', 3),
    ]);
    expect(best).toEqual({ [first]: 3 });
    expect(starTotals([first, second], best)).toEqual({ stars: 3, finished: 1 });
  });

  it('counts a section as finished only when every lesson in it is done', () => {
    const sectionId = courseLessons[0].section.id;
    const inSection = courseLessons.filter((entry) => entry.section.id === sectionId);
    const almost = bestStars(inSection.slice(0, -1).map((entry) => result(entry.lesson.id, 1)));
    expect(sectionFinished(sectionId, almost)).toBe(false);
    const all = bestStars(inSection.map((entry) => result(entry.lesson.id, 1)));
    expect(sectionFinished(sectionId, all)).toBe(true);
  });

  it('turns slips into stars', () => {
    expect([0, 1, 2, 3, 9].map(starsForSlips)).toEqual([3, 2, 2, 1, 1]);
  });
});

it('starts an unfinished lesson over from step 1, keeping slips, and keeps a finished one', () => {
  const { lesson } = courseLessons[0];
  const run = { lessonId: lesson.id, step: 2, slips: 1 };
  expect(restartCourseRun(run)).toEqual({ ...run, step: 0 });
  const start = { ...run, step: 0 };
  expect(restartCourseRun(start)).toBe(start);
  const finished = { ...run, step: lesson.steps.length };
  expect(restartCourseRun(finished)).toBe(finished);
  expect(restartCourseRun(null)).toBeNull();
});
