import { branchForGuide, branchesForGuide, transfersForGuide } from '@/content/lessons';
import {
  answerLesson,
  beginLesson,
  lessonAttempt,
  lessonFen,
  lessonKey,
  lessonReviews,
  nextLessonReview,
  restartLesson,
} from '@/learning/lesson';
import { emptyProgress, type LessonSession } from '@/progress/types';
import { useProgressStore } from '@/progress/store';
import { decodeProgress, validProgress } from '@/storage/schema';
import { positionAfter, INITIAL_POSITION, legalMoves } from '@/chess';

const now = new Date('2026-10-22T10:00:00Z');
function finish(session: LessonSession) {
  while (session.phase === 'solve') {
    const branch = branchForGuide(session.guideId, session.targetId)!;
    session = answerLesson(session, branch.moves[session.ply]);
  }
  return session;
}
beforeEach(() => useProgressStore.setState({ ...emptyProgress(), hydrated: true }));

it.each(['italian-game', 'caro-kann', 'queens-gambit'])(
  'learns branches with guidance before independent recall: %s',
  (guideId) => {
    for (const branch of branchesForGuide(guideId)) {
      const guided = finish(beginLesson(guideId, 'branch', branch.id, [], now)!);
      const first = lessonAttempt(guided, now);
      expect(first.independent).toBe(false);
      const recall = beginLesson(guideId, 'branch', branch.id, [first], now)!;
      expect(recall).toMatchObject({ scaffold: 'recall', hintShown: false, usedHelp: false });
      expect(lessonAttempt(finish(recall), now).independent).toBe(true);
      expect(lessonFen(guided)).toBe(positionAfter(INITIAL_POSITION, branch.moves));
    }
  },
);

it('accepts a supported alternative at the shared branch point and follows that path', () => {
  const guideId = 'italian-game';
  const base = branchForGuide(guideId, 'main')!;
  const alternate = branchForGuide(guideId, 'evans-gambit')!;
  let session = beginLesson(guideId, 'branch', 'main', [], now)!;
  const divergence = alternate.moves.findIndex((move, index) => move !== base.moves[index]);
  expect(divergence % 2).toBe(0);
  while (session.ply < divergence) session = answerLesson(session, alternate.moves[session.ply]);
  session = answerLesson(session, alternate.moves[divergence]);
  expect(session.targetId).toBe(alternate.id);
  expect(session.mistakes).toBe(0);
  expect(finish(session).phase).toBe('complete');
});

it('tracks assistance and retries without recording duplicate completions', () => {
  const key = lessonKey('branch', 'italian-game', 'main');
  const store = useProgressStore.getState;
  store().startLesson('italian-game', 'branch', 'main');
  while (store().lessonProgress.sessions[key].phase === 'solve') {
    const session = store().lessonProgress.sessions[key];
    store().answerLesson(key, branchForGuide('italian-game', session.targetId)!.moves[session.ply]);
  }
  store().answerLesson(key, 'e2e4');
  expect(store().lessonProgress.attempts).toHaveLength(1);
  store().startLesson('italian-game', 'branch', 'main', true);
  store().helpLesson(key);
  expect(store().lessonProgress.sessions[key]).toMatchObject({
    scaffold: 'recall',
    usedHelp: true,
    hintShown: true,
  });
  while (store().lessonProgress.sessions[key].phase === 'solve') {
    const session = store().lessonProgress.sessions[key];
    store().answerLesson(key, branchForGuide('italian-game', session.targetId)!.moves[session.ply]);
  }
  expect(store().lessonProgress.attempts.at(-1)?.independent).toBe(false);
});

it('reloads a supported branch switch under its actual target key from its first move, then reviews it', () => {
  const state = useProgressStore.getState;
  const key = lessonKey('branch', 'italian-game', 'main');
  const recalledKey = lessonKey('branch', 'italian-game', 'evans-gambit');
  const alternate = branchForGuide('italian-game', 'evans-gambit')!;
  state().startLesson('italian-game', 'branch', 'main');
  for (const ply of [0, 2, 4, 6]) state().answerLesson(key, alternate.moves[ply]);
  const snapshot = emptyProgress();
  snapshot.lessonProgress = state().lessonProgress;
  const switched = snapshot.lessonProgress.sessions[recalledKey];
  const restored = decodeProgress(JSON.stringify({ state: snapshot, version: 1 })).state;
  useProgressStore.setState({ ...restored, hydrated: true });
  expect(state().lessonProgress.selected['italian-game']).toBe(recalledKey);
  state().selectLesson('italian-game', 'branch', 'main');
  expect(state().lessonProgress.sessions[key]).toBeUndefined();
  expect(switched.ply).toBe(8);
  expect(state().lessonProgress.sessions[recalledKey]).toEqual({
    ...switched,
    ply: 0,
    acceptedMove: null,
  });
  state().startLesson('italian-game', 'branch', 'evans-gambit');
  while (state().lessonProgress.sessions[recalledKey].phase === 'solve') {
    state().answerLesson(
      recalledKey,
      alternate.moves[state().lessonProgress.sessions[recalledKey].ply],
    );
  }
  const outcome = state().lessonProgress.attempts[0];
  expect(outcome.targetId).toBe('evans-gambit');
  expect(lessonReviews([outcome], '2099-01-01')[0].attempt.targetId).toBe('evans-gambit');
  state().startLesson('italian-game', 'branch', 'evans-gambit', true);
  expect(state().lessonProgress.selected['italian-game']).toBe(recalledKey);
  expect(state().lessonProgress.sessions[recalledKey]).toMatchObject({
    ply: 0,
    scaffold: 'recall',
    usedHelp: false,
  });
});

it('carries on into a variation left unfinished earlier, keeping its earlier mistakes', () => {
  const state = useProgressStore.getState;
  const mainKey = lessonKey('branch', 'italian-game', 'main');
  const alternateKey = lessonKey('branch', 'italian-game', 'evans-gambit');
  const mainBranch = branchForGuide('italian-game', 'main')!;
  const alternate = branchForGuide('italian-game', 'evans-gambit')!;
  const first = lessonAttempt(
    finish(beginLesson('italian-game', 'branch', 'evans-gambit', [], now)!),
    now,
  );
  let main = beginLesson('italian-game', 'branch', 'main', [], now)!;
  for (const ply of [0, 2, 4]) main = answerLesson(main, mainBranch.moves[ply]);
  let left = beginLesson('italian-game', 'branch', 'evans-gambit', [first], now)!;
  for (const ply of [0, 2, 4, 6, 8]) left = answerLesson(left, alternate.moves[ply]);
  left = restartLesson({ ...left, usedHelp: true, mistakes: 2 });
  expect(left).toMatchObject({ ply: 0, usedHelp: true, mistakes: 2, phase: 'solve' });
  useProgressStore.setState({
    lessonProgress: {
      ...emptyProgress().lessonProgress,
      attempts: [first],
      sessions: { [mainKey]: main, [alternateKey]: left },
      selected: { 'italian-game': mainKey },
    },
  });
  state().answerLesson(mainKey, 'b2b4');
  expect(state().lessonProgress.selected['italian-game']).toBe(alternateKey);
  expect(state().lessonProgress.sessions[mainKey]).toBeUndefined();
  expect(state().lessonProgress.sessions[alternateKey]).toMatchObject({
    id: main.id,
    ply: 8,
    usedHelp: true,
    mistakes: 2,
  });
  for (const ply of [8, 10]) state().answerLesson(alternateKey, alternate.moves[ply]);
  expect(state().lessonProgress.attempts).toHaveLength(2);
  expect(state().lessonProgress.attempts.at(-1)).toMatchObject({
    targetId: 'evans-gambit',
    independent: false,
  });
});

it('starts unfinished lessons over when they are left or the app reopens, keeping help', () => {
  const state = useProgressStore.getState;
  const key = lessonKey('branch', 'caro-kann', 'main');
  state().startLesson('caro-kann', 'branch', 'main');
  const branch = branchForGuide('caro-kann', 'main')!;
  state().helpLesson(key);
  state().answerLesson(key, branch.moves[1]);
  state().wrongLesson(key);
  expect(state().lessonProgress.sessions[key]).toMatchObject({ ply: 3, lastWrong: true });
  const saved = { ...emptyProgress(), lessonProgress: state().lessonProgress };
  const reopened = decodeProgress(JSON.stringify({ state: saved, version: 1 })).state;
  state().leaveLessons();
  for (const session of [
    state().lessonProgress.sessions[key],
    reopened.lessonProgress.sessions[key],
  ])
    expect(session).toMatchObject({ ply: 1, lastWrong: false, usedHelp: true, mistakes: 1 });
});

it('rejects noncanonical lesson keys without changing real legacy progress support', () => {
  const state = emptyProgress();
  const mainKey = lessonKey('branch', 'italian-game', 'main');
  state.lessonProgress.sessions[mainKey] = beginLesson(
    'italian-game',
    'branch',
    'evans-gambit',
    [],
    now,
  )!;
  expect(validProgress(state)).toBe(false);
});

it('starts main practice from its first move despite an old saved position, then restarts without hints', () => {
  const state = useProgressStore.getState;
  const key = lessonKey('branch', 'caro-kann', 'main');
  useProgressStore.setState({
    guideProgress: {
      'caro-kann': { viewedPly: 4, practicePly: 3, completedAt: null },
    },
  });
  state().startLesson('caro-kann', 'branch', 'main');
  expect(state().lessonProgress.sessions[key]).toMatchObject({ ply: 1, scaffold: 'guided' });
  while (state().lessonProgress.sessions[key].phase === 'solve') {
    const session = state().lessonProgress.sessions[key];
    state().answerLesson(key, branchForGuide('caro-kann', 'main')!.moves[session.ply]);
  }
  expect(state().lessonProgress.attempts[0].independent).toBe(false);
  expect(state().guideProgress['caro-kann'].viewedPly).toBe(4);
  state().startLesson('caro-kann', 'branch', 'main', true);
  expect(state().lessonProgress.sessions[key]).toMatchObject({
    ply: 1,
    scaffold: 'recall',
    usedHelp: false,
    hintShown: false,
  });
});

it('records correct transfer answers separately and schedules a later check, without early promotion', () => {
  const exercise = transfersForGuide('italian-game')[0];
  const session = beginLesson('italian-game', 'transfer', exercise.id, [], now)!;
  const wrong = legalMoves(exercise.fen).find((move) => !exercise.answers.includes(move.uci))!;
  const retried = answerLesson(answerLesson(session, wrong.uci), exercise.answers[0]);
  expect(lessonAttempt(retried, now).independent).toBe(false);
  const correct = answerLesson(session, exercise.answers[0]);
  const first = lessonAttempt(correct, now);
  expect(first.independent).toBe(true);
  expect(lessonReviews([first], '2026-10-22')).toEqual([]);
  expect(lessonReviews([first], '2026-10-23')).toHaveLength(1);
  const early = { ...first, id: 'early', completedAt: '2026-10-22T12:00:00Z' };
  expect(nextLessonReview([first, early], correct)).toBe('2026-10-23');
  const later = {
    ...first,
    id: 'later',
    dateKey: '2026-10-23',
    completedAt: '2026-10-23T12:00:00Z',
  };
  expect(nextLessonReview([first, later], correct)).toBe('2026-10-26');
});

it('preserves legacy viewing, partial practice and completion without granting independent mastery', () => {
  const { lessonProgress: omitted, ...legacy } = emptyProgress();
  void omitted;
  legacy.guideProgress['caro-kann'] = {
    viewedPly: 4,
    practicePly: 3,
    completedAt: '2026-10-20T10:00:00Z',
  };
  legacy.attempts.push({
    id: 'old-puzzle',
    puzzleId: 'old',
    independent: true,
    dateKey: '2026-10-20',
    completedAt: '2026-10-20T10:00:00Z',
  });
  const normalized = decodeProgress(JSON.stringify({ state: legacy, version: 1 })).state;
  expect(normalized.guideProgress).toEqual(legacy.guideProgress);
  expect(normalized.attempts).toEqual(legacy.attempts);
  expect(normalized.lessonProgress.attempts).toEqual([]);
  // A saved practice position no longer resumes the main line part-way.
  const started = beginLesson('caro-kann', 'branch', 'main', [], now)!;
  expect(started).toMatchObject({ ply: 1, scaffold: 'guided', usedHelp: true });
});

it('validates a resumed branch and transfer with assistance and rejects impossible progress', () => {
  const state = emptyProgress();
  const key = lessonKey('branch', 'caro-kann', 'main');
  state.lessonProgress.sessions[key] = beginLesson('caro-kann', 'branch', 'main', [], now)!;
  state.lessonProgress.selected['caro-kann'] = key;
  expect(validProgress(state)).toBe(true);
  expect(decodeProgress(JSON.stringify({ state, version: 1 })).state).toEqual(state);
  state.lessonProgress.sessions[key].ply = 0;
  expect(validProgress(state)).toBe(false);
  delete state.lessonProgress.sessions[key];
  const exercise = transfersForGuide('caro-kann')[0];
  const transferKey = lessonKey('transfer', 'caro-kann', exercise.id);
  state.lessonProgress.sessions[transferKey] = {
    ...beginLesson('caro-kann', 'transfer', exercise.id, [], now)!,
    usedHelp: true,
    hintShown: true,
  };
  expect(validProgress(state)).toBe(true);
  state.lessonProgress.sessions[transferKey].acceptedMove = 'a1a1';
  expect(validProgress(state)).toBe(false);
});
