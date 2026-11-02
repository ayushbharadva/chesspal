import { guideById, puzzleById } from '@/content';
import { readPosition } from '@/chess';
import { branchForGuide } from '@/content/lessons';
import { lessonTarget } from '@/learning/lesson';
import { PUZZLE_LEVELS, SKILL_THEMES } from '@/content/types';
import { ROUTE_FORKS } from '@/daily-route/route';
import { defaultSettings, emptyLessonProgress, type SavedProgress } from '@/progress/types';
import { emptyVisionScores, KEPT_SCORES } from '@/vision/coordinates';

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

function lessonIdentity(value: Record<string, unknown>) {
  return (
    typeof value.guideId === 'string' &&
    typeof value.targetId === 'string' &&
    (value.kind === 'branch' || value.kind === 'transfer') &&
    Boolean(lessonTarget(value.guideId, value.kind, value.targetId))
  );
}
function validLessonKey(key: string) {
  const [kind, guideId, targetId, extra] = key.split('/');
  return (
    !extra &&
    (kind === 'branch' || kind === 'transfer') &&
    Boolean(lessonTarget(guideId, kind, targetId))
  );
}
function lessonProgress(value: unknown) {
  if (
    !record(value) ||
    !Array.isArray(value.attempts) ||
    !record(value.sessions) ||
    !record(value.selected) ||
    !record(value.viewed)
  )
    return false;
  if (
    !value.attempts.every(
      (item: unknown) =>
        record(item) &&
        lessonIdentity(item) &&
        typeof item.id === 'string' &&
        typeof item.independent === 'boolean' &&
        validDate(item.dateKey) &&
        typeof item.completedAt === 'string' &&
        Number.isFinite(Date.parse(item.completedAt)),
    )
  )
    return false;
  for (const [key, session] of Object.entries(value.sessions)) {
    if (
      !validLessonKey(key) ||
      !record(session) ||
      !lessonIdentity(session) ||
      key.split('/')[1] !== session.guideId ||
      key.split('/')[0] !== session.kind ||
      key.split('/')[2] !== session.targetId ||
      typeof session.id !== 'string' ||
      !integer(session.ply) ||
      !integer(session.mistakes) ||
      !['solve', 'complete'].includes(String(session.phase)) ||
      !['guided', 'recall'].includes(String(session.scaffold)) ||
      typeof session.usedHelp !== 'boolean' ||
      typeof session.hintShown !== 'boolean' ||
      typeof session.lastWrong !== 'boolean' ||
      (session.scaffold === 'guided' && !session.usedHelp) ||
      !(
        session.acceptedMove === null ||
        (typeof session.acceptedMove === 'string' &&
          /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(session.acceptedMove))
      )
    )
      return false;
    if (session.kind === 'branch') {
      const branch = branchForGuide(String(session.guideId), String(session.targetId))!;
      const side = guideById[String(session.guideId)].side === 'b' ? 1 : 0;
      if (
        session.phase === 'complete'
          ? session.ply !== branch.moves.length
          : session.ply >= branch.moves.length || Number(session.ply) % 2 !== side
      )
        return false;
    } else {
      if (session.scaffold !== 'recall') return false;
      if (session.phase === 'complete') {
        const target = lessonTarget(String(session.guideId), 'transfer', String(session.targetId));
        if (
          !target ||
          !('answers' in target) ||
          session.ply !== 1 ||
          !target.answers.includes(String(session.acceptedMove))
        )
          return false;
      } else if (session.ply !== 0 || session.acceptedMove !== null) return false;
    }
  }
  for (const [guideId, key] of Object.entries(value.selected)) {
    if (typeof key !== 'string' || !validLessonKey(key) || key.split('/')[1] !== guideId)
      return false;
  }
  for (const [key, ply] of Object.entries(value.viewed)) {
    const [kind, guideId, targetId] = key.split('/');
    if (
      kind !== 'branch' ||
      !validLessonKey(key) ||
      !integer(ply, branchForGuide(guideId, targetId)!.moves.length)
    )
      return false;
  }
  return true;
}

const MODES = ['daily', 'extra', 'review', 'skill', 'route'];
function rung(value: unknown) {
  return value === 1 || value === 2 || value === 3;
}
function puzzleLevel(value: unknown) {
  return PUZZLE_LEVELS.some((level) => level === value);
}
function skillTheme(value: unknown) {
  return SKILL_THEMES.some((theme) => theme === value);
}
function themeProgress(value: unknown) {
  return (
    record(value) &&
    Object.entries(value).every(
      ([theme, progress]) =>
        skillTheme(theme) &&
        record(progress) &&
        integer(progress.runs) &&
        Array.isArray(progress.cleared) &&
        progress.cleared.every(rung) &&
        new Set(progress.cleared).size === progress.cleared.length,
    )
  );
}
/** Skill progress by level, or the older shape by theme alone. */
function skillProgress(value: unknown) {
  return (
    themeProgress(value) ||
    (record(value) &&
      Object.entries(value).every(
        ([level, themes]) => puzzleLevel(Number(level)) && themeProgress(themes),
      ))
  );
}
/** Older saves kept one set of skill progress; it belongs to the level the player had chosen. */
function skillProgressByLevel(value: unknown, level: unknown) {
  if (!record(value)) return {};
  return Object.keys(value).some(skillTheme)
    ? { [puzzleLevel(level) ? Number(level) : 1]: value }
    : value;
}
function visionScores(value: unknown) {
  return (
    record(value) &&
    [value.w, value.b].every(
      (scores) =>
        Array.isArray(scores) &&
        scores.length <= KEPT_SCORES &&
        scores.every((score) => integer(score, 1000)),
    )
  );
}

function routeRuns(value: unknown) {
  return (
    Array.isArray(value) &&
    value.every(
      (run: unknown) =>
        record(run) &&
        validDate(run.dateKey) &&
        integer(run.score, 100) &&
        integer(run.steepTaken, ROUTE_FORKS.length) &&
        puzzleLevel(run.level),
    )
  );
}
function settings(value: unknown) {
  return (
    record(value) &&
    ['system', 'light', 'dark'].includes(String(value.appearance)) &&
    typeof value.haptics === 'boolean' &&
    (value.sounds === undefined || typeof value.sounds === 'boolean')
  );
}
function routeState(value: unknown) {
  return (
    record(value) &&
    skillTheme(value.theme) &&
    Array.isArray(value.steepIds) &&
    value.steepIds.length === ROUTE_FORKS.length &&
    value.steepIds.every((id: unknown) => typeof id === 'string' && puzzleById[id]) &&
    Array.isArray(value.taken) &&
    value.taken.every((index: unknown) => ROUTE_FORKS.some((fork) => fork === index)) &&
    typeof value.choosing === 'boolean'
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
  if (value.lessonProgress !== undefined && !lessonProgress(value.lessonProgress)) return false;
  if (value.level !== undefined && value.level !== null && !puzzleLevel(value.level)) return false;
  if (value.skillProgress !== undefined && !skillProgress(value.skillProgress)) return false;
  if (value.visionScores !== undefined && !visionScores(value.visionScores)) return false;
  if (value.routeRuns !== undefined && !routeRuns(value.routeRuns)) return false;
  if (value.settings !== undefined && !settings(value.settings)) return false;
  if (
    !value.completions.every(
      (item: unknown) =>
        record(item) &&
        typeof item.id === 'string' &&
        validDate(item.dateKey) &&
        integer(item.total, 100) &&
        integer(item.independent, Number(item.total)) &&
        MODES.includes(String(item.mode)),
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
    session.mode === 'skill'
      ? !record(session.skill) ||
        !skillTheme(session.skill.theme) ||
        !rung(session.skill.rung) ||
        !integer(session.skill.run) ||
        (session.skill.level !== undefined && !puzzleLevel(session.skill.level))
      : session.skill !== undefined
  )
    return false;
  if (session.mode === 'route' ? !routeState(session.route) : session.route !== undefined)
    return false;
  if (
    !MODES.includes(String(session.mode)) ||
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
  const { state } = envelope;
  const skill = state.currentSession?.skill;
  return {
    ...envelope,
    state: {
      ...state,
      // Skill rounds saved before levels were recorded were played at the saved level.
      currentSession:
        skill && skill.level === undefined
          ? { ...state.currentSession!, skill: { ...skill, level: state.level ?? 1 } }
          : state.currentSession,
      lessonProgress: state.lessonProgress ?? emptyLessonProgress(),
      level: state.level ?? null,
      skillProgress: skillProgressByLevel(state.skillProgress, state.level),
      visionScores: state.visionScores ?? emptyVisionScores(),
      routeRuns: state.routeRuns ?? [],
      settings: { ...defaultSettings(), ...state.settings },
    },
  };
}
