import { guideById, puzzleById } from '@/content';
import { readPosition } from '@/chess';
import { type SavedProgress } from '@/progress/types';

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function integer(value: unknown, maximum = 100_000): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= maximum;
}
function validDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
function attempt(value: unknown) {
  return (
    record(value) &&
    typeof value.id === 'string' &&
    typeof value.puzzleId === 'string' &&
    typeof value.independent === 'boolean' &&
    validDate(value.dateKey) &&
    typeof value.completedAt === 'string' &&
    Number.isFinite(Date.parse(value.completedAt))
  );
}

export function validProgress(value: unknown): value is SavedProgress {
  if (
    !record(value) ||
    !Array.isArray(value.attempts) ||
    !value.attempts.every(attempt) ||
    !Array.isArray(value.completions) ||
    !record(value.guideProgress)
  )
    return false;
  if (
    !value.completions.every(
      (item: unknown) =>
        record(item) &&
        typeof item.id === 'string' &&
        validDate(item.dateKey) &&
        integer(item.total, 100) &&
        integer(item.independent, Number(item.total)) &&
        ['daily', 'extra', 'review'].includes(String(item.mode)),
    )
  )
    return false;
  for (const [id, progress] of Object.entries(value.guideProgress)) {
    if (!guideById[id]) continue;
    if (
      !record(progress) ||
      !integer(progress.viewedPly, guideById[id].moves.length) ||
      !integer(progress.practicePly, guideById[id].moves.length) ||
      (progress.practicePly !== guideById[id].moves.length &&
        Number(progress.practicePly) % 2 !== (guideById[id].side === 'b' ? 1 : 0)) ||
      !(
        progress.completedAt === null ||
        (typeof progress.completedAt === 'string' &&
          Number.isFinite(Date.parse(progress.completedAt)))
      )
    )
      return false;
  }
  const session = value.currentSession;
  if (session === null) return true;
  if (
    !record(session) ||
    typeof session.id !== 'string' ||
    !validDate(session.dateKey) ||
    !Array.isArray(session.puzzleIds) ||
    !session.puzzleIds.length ||
    !session.puzzleIds.every((id: unknown) => typeof id === 'string' && puzzleById[id]) ||
    new Set(session.puzzleIds).size !== session.puzzleIds.length
  )
    return false;
  if (
    !integer(session.index, session.puzzleIds.length) ||
    !integer(session.ply) ||
    !integer(session.hintsShown, 3) ||
    typeof session.usedHelp !== 'boolean' ||
    !integer(session.mistakes) ||
    typeof session.lastWrong !== 'boolean' ||
    !(session.acceptedFen === null || typeof session.acceptedFen === 'string')
  )
    return false;
  if (typeof session.acceptedFen === 'string') {
    try {
      readPosition(session.acceptedFen);
    } catch {
      return false;
    }
  }
  if (!(
    session.acceptedMove === null ||
    (typeof session.acceptedMove === 'string' &&
      /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(session.acceptedMove))
  ))
    return false;
  if (
    !['daily', 'extra', 'review'].includes(String(session.mode)) ||
    !['solve', 'replay', 'feedback', 'complete'].includes(String(session.phase)) ||
    !Array.isArray(session.results) ||
    !session.results.every(attempt)
  )
    return false;
  if (session.phase === 'complete')
    return (
      session.index === session.puzzleIds.length &&
      session.results.length === session.puzzleIds.length
    );
  if (session.index >= session.puzzleIds.length) return false;
  const puzzle = puzzleById[String(session.puzzleIds[session.index])];
  if (
    session.ply > puzzle.moves.length ||
    (session.phase === 'solve' && (session.ply % 2 !== 0 || session.ply >= puzzle.moves.length))
  )
    return false;
  return session.results.length === session.index + (session.phase === 'feedback' ? 1 : 0);
}

export function decodeProgress(raw: string) {
  const envelope: unknown = JSON.parse(raw);
  if (!record(envelope) || envelope.version !== 1 || !validProgress(envelope.state))
    throw new Error('Invalid saved progress');
  return envelope;
}
