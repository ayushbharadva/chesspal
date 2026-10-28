import { INITIAL_POSITION, playMove, positionAfter } from '@/chess';
import { guideById } from '@/content';
import { branchForGuide, branchesForGuide, transfersForGuide } from '@/content/lessons';
import { type LessonAttempt, type LessonKind, type LessonSession } from '@/progress/types';
import { dateKey } from '@/utils/date-key';
import { reviewSchedule } from '@/workout/review';

export function lessonKey(kind: LessonKind, guideId: string, targetId: string) {
  return `${kind}/${guideId}/${targetId}`;
}
export function lessonTarget(guideId: string, kind: LessonKind, targetId: string) {
  if (!guideById[guideId]) return undefined;
  return kind === 'branch'
    ? branchForGuide(guideId, targetId)
    : transfersForGuide(guideId).find((exercise) => exercise.id === targetId);
}
export function lessonFen(session: LessonSession) {
  if (session.kind === 'branch') {
    const branch = branchForGuide(session.guideId, session.targetId)!;
    return positionAfter(INITIAL_POSITION, branch.moves, session.ply);
  }
  const exercise = transfersForGuide(session.guideId).find((item) => item.id === session.targetId)!;
  return session.acceptedMove ? playMove(exercise.fen, session.acceptedMove).fen : exercise.fen;
}
export function beginLesson(
  guideId: string,
  kind: LessonKind,
  targetId: string,
  attempts: LessonAttempt[],
  now: Date,
  legacyPly = 0,
): LessonSession | undefined {
  const target = lessonTarget(guideId, kind, targetId);
  if (!target) return undefined;
  const practiced = attempts.some(
    (attempt) =>
      attempt.guideId === guideId && attempt.kind === kind && attempt.targetId === targetId,
  );
  const guided = kind === 'branch' && !practiced;
  const firstPly = guideById[guideId].side === 'b' ? 1 : 0;
  const branch = kind === 'branch' ? branchForGuide(guideId, targetId)! : undefined;
  const resumedPly = branch && legacyPly < branch.moves.length ? legacyPly : firstPly;
  return {
    id: `lesson-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    guideId,
    kind,
    targetId,
    ply: branch ? (guided && targetId === 'main' ? Math.max(firstPly, resumedPly) : firstPly) : 0,
    phase: 'solve',
    scaffold: guided ? 'guided' : 'recall',
    usedHelp: guided,
    hintShown: guided,
    mistakes: 0,
    lastWrong: false,
    acceptedMove: null,
  };
}
export function wrongLessonMove(session: LessonSession): LessonSession {
  if (session.phase !== 'solve') return session;
  return { ...session, mistakes: session.mistakes + 1, lastWrong: true };
}
export function answerLesson(session: LessonSession, move: string): LessonSession {
  if (session.phase !== 'solve') return session;
  try {
    playMove(lessonFen(session), move);
  } catch {
    return wrongLessonMove(session);
  }
  if (session.kind === 'transfer') {
    const exercise = transfersForGuide(session.guideId).find(
      (item) => item.id === session.targetId,
    )!;
    if (!exercise.answers.includes(move)) return wrongLessonMove(session);
    return { ...session, phase: 'complete', ply: 1, acceptedMove: move, lastWrong: false };
  }
  const current = branchForGuide(session.guideId, session.targetId)!;
  const branch = [
    current,
    ...branchesForGuide(session.guideId).filter((item) => item.id !== current.id),
  ].find(
    (candidate) =>
      candidate.moves[session.ply] === move &&
      candidate.moves.slice(0, session.ply).every((prior, index) => prior === current.moves[index]),
  );
  if (!branch) return wrongLessonMove(session);
  const ply = Math.min(branch.moves.length, session.ply + 2);
  return {
    ...session,
    targetId: branch.id,
    ply,
    phase: ply === branch.moves.length ? 'complete' : 'solve',
    hintShown: session.scaffold === 'guided',
    acceptedMove: move,
    lastWrong: false,
  };
}
export function lessonAttempt(session: LessonSession, now: Date): LessonAttempt {
  return {
    id: session.id,
    guideId: session.guideId,
    targetId: session.targetId,
    kind: session.kind,
    independent: session.scaffold === 'recall' && !session.usedHelp && session.mistakes === 0,
    dateKey: dateKey(now),
    completedAt: now.toISOString(),
  };
}
export function lessonReviews(attempts: LessonAttempt[], localDate = dateKey()) {
  const schedule = reviewSchedule(
    attempts.map((attempt) => ({
      ...attempt,
      puzzleId: lessonKey(attempt.kind, attempt.guideId, attempt.targetId),
    })),
  );
  return [...schedule.values()]
    .filter((review) => review.dueDate <= localDate)
    .map((review) => ({ ...review, attempt: review.lastAttempt as unknown as LessonAttempt }))
    .filter((review) =>
      lessonTarget(review.attempt.guideId, review.attempt.kind, review.attempt.targetId),
    )
    .sort((first, second) => first.dueDate.localeCompare(second.dueDate));
}
export function nextLessonReview(attempts: LessonAttempt[], session: LessonSession) {
  return reviewSchedule(
    attempts.map((attempt) => ({
      ...attempt,
      puzzleId: lessonKey(attempt.kind, attempt.guideId, attempt.targetId),
    })),
  ).get(lessonKey(session.kind, session.guideId, session.targetId))?.dueDate;
}
