import { courseLessons } from '@/content/course';
import { practiceDates } from '@/progress/activity';
import { useProgressStore } from '@/progress/store';
import { emptyProgress } from '@/progress/types';
import { decodeProgress, validProgress } from '@/storage/schema';

const state = useProgressStore.getState;
const [first, second] = courseLessons.map((entry) => entry.lesson);

function finishLesson(slipsPerStep = 0) {
  const steps = courseLessons.find(
    (entry) => entry.lesson.id === state().courseProgress.current!.lessonId,
  )!.lesson.steps.length;
  for (let step = 0; step < steps; step++) state().finishCourseStep(slipsPerStep);
}

beforeEach(() => useProgressStore.setState({ ...emptyProgress(), hydrated: true }));

it('opens only unlocked lessons and resumes the one in progress', () => {
  expect(state().startCourse(second.id)).toBe(false);
  expect(state().startCourse(first.id)).toBe(true);
  state().finishCourseStep(1);
  expect(state().startCourse(first.id)).toBe(true);
  expect(state().courseProgress.current).toEqual({ lessonId: first.id, step: 1, slips: 1 });
});

it('saves stars after the last step, unlocks the next lesson and counts the day', () => {
  state().startCourse(first.id);
  finishLesson();
  const { results, current } = state().courseProgress;
  expect(results).toHaveLength(1);
  expect(results[0]).toMatchObject({ lessonId: first.id, stars: 3 });
  expect(current?.step).toBe(first.steps.length);
  state().closeCourse();
  expect(state().courseProgress.current).toBeNull();
  expect(state().startCourse(second.id)).toBe(true);
  expect(practiceDates([], [], results)).toEqual([results[0].dateKey]);
});

it('lowers stars with slips and keeps a replay from lowering the best', () => {
  state().startCourse(first.id);
  finishLesson(1);
  expect(state().courseProgress.results[0].stars).toBe(1);
  state().closeCourse();
  state().startCourse(first.id);
  finishLesson(0);
  expect(state().courseProgress.results.map((result) => result.stars)).toEqual([1, 3]);
});

it('loads older saves without course progress and drops runs for removed lessons', () => {
  const { courseProgress: _course, ...older } = emptyProgress();
  expect(decodeProgress(JSON.stringify({ state: older, version: 1 })).state.courseProgress).toEqual(
    {
      results: [],
      current: null,
    },
  );
  const removed = {
    ...emptyProgress(),
    courseProgress: { results: [], current: { lessonId: 'gone', step: 4, slips: 0 } },
  };
  expect(
    decodeProgress(JSON.stringify({ state: removed, version: 1 })).state.courseProgress.current,
  ).toBeNull();
  expect(
    validProgress({
      ...emptyProgress(),
      courseProgress: { results: [{ id: 'x', lessonId: first.id, stars: 4 }], current: null },
    }),
  ).toBe(false);
});
