import { guides } from '@/content';
import { branchesForGuide, transfersForGuide } from '@/content/lessons';
import { beginLesson, lessonKey } from '@/learning/lesson';
import { nextLesson } from '@/learning/next-lesson';
import { emptyLessonProgress, type LessonAttempt, type LessonKind } from '@/progress/types';

const today = '2026-10-27';
function attempt(guideId: string, kind: LessonKind, targetId: string, day = today): LessonAttempt {
  return {
    id: `${guideId}/${kind}/${targetId}/${day}`,
    guideId,
    kind,
    targetId,
    independent: false,
    dateKey: day,
    completedAt: `${day}T10:00:00Z`,
  };
}

it('starts with a demonstration without creating an attempt or review', () => {
  const progress = emptyLessonProgress();
  expect(nextLesson(progress, today)).toEqual({
    guideId: guides[0].id,
    kind: 'branch',
    targetId: 'main',
    reason: 'learn',
  });
  expect(progress).toEqual(emptyLessonProgress());
});

it('resumes saved practice ahead of due reviews, preserving its help and mistakes', () => {
  const progress = emptyLessonProgress();
  const guideId = guides[1].id;
  const session = { ...beginLesson(guideId, 'branch', 'main', [], new Date())!, mistakes: 2 };
  const key = lessonKey('branch', guideId, 'main');
  progress.sessions[key] = session;
  progress.attempts = [attempt(guides[0].id, 'branch', 'main', '2026-10-26')];
  const snapshot = JSON.stringify(progress);
  expect(nextLesson(progress, today)).toEqual({
    guideId,
    kind: 'branch',
    targetId: 'main',
    reason: 'resume',
  });
  expect(JSON.stringify(progress)).toBe(snapshot);
});

it('prefers the selected unfinished lesson and falls back to another saved lesson', () => {
  const progress = emptyLessonProgress();
  const guideId = guides[0].id;
  for (const branch of branchesForGuide(guideId).slice(0, 2)) {
    progress.sessions[lessonKey('branch', guideId, branch.id)] = beginLesson(
      guideId,
      'branch',
      branch.id,
      [],
      new Date(),
    )!;
  }
  const targetId = branchesForGuide(guideId)[1].id;
  progress.selected[guideId] = lessonKey('branch', guideId, targetId);
  expect(nextLesson(progress, today)?.targetId).toBe(targetId);
  progress.selected = {};
  expect(nextLesson(progress, today)?.targetId).toBe('main');
});

it('shows application today and recall only when its local calendar date is due', () => {
  const progress = emptyLessonProgress();
  const guideId = guides[1].id;
  progress.attempts = [attempt(guideId, 'branch', 'main')];
  expect(nextLesson(progress, today)).toEqual({
    guideId,
    kind: 'transfer',
    targetId: transfersForGuide(guideId)[0].id,
    reason: 'apply',
  });
  expect(nextLesson(progress, '2026-10-28')).toEqual({
    guideId,
    kind: 'branch',
    targetId: 'main',
    reason: 'review',
  });
});

it('picks the oldest due review ahead of new content, including independent solves', () => {
  const progress = emptyLessonProgress();
  const guideId = guides[0].id;
  const targetId = transfersForGuide(guideId)[0].id;
  progress.attempts = [
    attempt(guideId, 'branch', 'main', '2026-10-26'),
    { ...attempt(guideId, 'transfer', targetId, '2026-10-24'), independent: true },
  ];
  expect(nextLesson(progress, today)).toEqual({
    guideId,
    kind: 'transfer',
    targetId,
    reason: 'review',
  });
});

it('follows the most recently practiced guide when several guides have new content', () => {
  const progress = emptyLessonProgress();
  progress.attempts = [
    attempt(guides[0].id, 'branch', 'main'),
    { ...attempt(guides[2].id, 'branch', 'main'), completedAt: today + 'T11:00:00Z' },
  ];
  expect(nextLesson(progress, today)?.guideId).toBe(guides[2].id);
});

it('advances through all existing examples without repeating early or claiming mastery', () => {
  const progress = emptyLessonProgress();
  const targets = guides.reduce(
    (total, guide) =>
      total + branchesForGuide(guide.id).length + transfersForGuide(guide.id).length,
    0,
  );
  for (let index = 0; index < targets; index += 1) {
    const step = nextLesson(progress, today)!;
    expect(step).not.toBeNull();
    expect(
      progress.attempts.some(
        (item) =>
          item.guideId === step.guideId &&
          item.kind === step.kind &&
          item.targetId === step.targetId,
      ),
    ).toBe(false);
    progress.attempts.push(attempt(step.guideId, step.kind, step.targetId));
  }
  expect(progress.attempts).toHaveLength(15);
  expect(nextLesson(progress, today)).toBeNull();
  expect(nextLesson(progress, '2026-10-28')?.reason).toBe('review');
});
