import { guideById, guides } from '@/content';
import { branchesForGuide, transfersForGuide } from '@/content/lessons';
import { lessonKey, lessonReviews, lessonTarget } from '@/learning/lesson';
import { type LessonKind, type LessonProgress } from '@/progress/types';
import { dateKey } from '@/utils/date-key';

export interface LearningStep {
  guideId: string;
  kind: LessonKind;
  targetId: string;
  reason: 'resume' | 'review' | 'apply' | 'learn';
}

export function nextLesson(progress: LessonProgress, localDate = dateKey()): LearningStep | null {
  const selected = new Set(Object.values(progress.selected));
  const unfinished = Object.values(progress.sessions).filter(
    (session) =>
      session.phase === 'solve' && lessonTarget(session.guideId, session.kind, session.targetId),
  );
  const resume =
    unfinished.find((session) =>
      selected.has(lessonKey(session.kind, session.guideId, session.targetId)),
    ) ?? unfinished[0];
  if (resume)
    return {
      guideId: resume.guideId,
      kind: resume.kind,
      targetId: resume.targetId,
      reason: 'resume',
    };

  const review = lessonReviews(progress.attempts, localDate)[0];
  if (review)
    return {
      guideId: review.attempt.guideId,
      kind: review.attempt.kind,
      targetId: review.attempt.targetId,
      reason: 'review',
    };

  const practiced = new Set(
    progress.attempts.map((attempt) => lessonKey(attempt.kind, attempt.guideId, attempt.targetId)),
  );
  const recent = [...progress.attempts].sort(
    (first, second) => Date.parse(second.completedAt) - Date.parse(first.completedAt),
  );
  const guideIds = [
    ...new Set([...recent.map((attempt) => attempt.guideId), ...guides.map((guide) => guide.id)]),
  ];
  for (const guideId of guideIds) {
    const guide = guideById[guideId];
    if (!guide) continue;
    const branches = branchesForGuide(guide.id);
    const hasPracticedBranch = branches.some((branch) =>
      practiced.has(lessonKey('branch', guide.id, branch.id)),
    );
    const transfer = transfersForGuide(guide.id).find(
      (exercise) => !practiced.has(lessonKey('transfer', guide.id, exercise.id)),
    );
    if (hasPracticedBranch && transfer)
      return {
        guideId: guide.id,
        kind: 'transfer',
        targetId: transfer.id,
        reason: 'apply',
      };
    const branch = branches.find((item) => !practiced.has(lessonKey('branch', guide.id, item.id)));
    if (branch) return { guideId: guide.id, kind: 'branch', targetId: branch.id, reason: 'learn' };
  }
  return null;
}
