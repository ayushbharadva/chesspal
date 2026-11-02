import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { positionAfter, type ChessColor } from '@/chess';
import { guideById, puzzleById } from '@/content';
import { recordRun, routeScore } from '@/daily-route/route';
import { type PuzzleLevel, type SkillTheme } from '@/content/types';
import { branchForGuide } from '@/content/lessons';
import {
  answerLesson,
  beginLesson,
  lessonAttempt,
  lessonKey,
  lessonTarget,
  wrongLessonMove,
} from '@/learning/lesson';
import {
  emptyProgress,
  type GuideProgress,
  type PracticeMode,
  type SavedProgress,
  type Settings,
  type LessonKind,
} from '@/progress/types';
import { RUNG_SIZE, rungCleared, type Rung } from '@/skills/ladder';
import { progressStorage, PROGRESS_KEY, reportStorageIssues } from '@/storage/storage';
import { dateKey } from '@/utils/date-key';
import { recordScore } from '@/vision/coordinates';
import {
  applyAnswer,
  attemptFor,
  chooseFork,
  makeRouteSession,
  makeSession,
  nextPuzzle,
} from '@/workout/session';

interface ProgressStore extends SavedProgress {
  hydrated: boolean;
  storageIssue: boolean;
  lessonNotice: { key: string; text: string } | null;
  startPractice: (mode?: PracticeMode) => boolean;
  setLevel: (level: PuzzleLevel) => void;
  /** Starts a ladder run; false while another practice round is unfinished. */
  startSkill: (theme: SkillTheme, rung: Rung) => boolean;
  /** Starts today's route; false while another round is unfinished or today's run is done. */
  startRoute: () => boolean;
  chooseRoute: (steep: boolean) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  recordVision: (side: ChessColor, score: number) => void;
  answer: (move: string) => void;
  hint: () => void;
  reveal: () => void;
  replayStep: (delta: number) => void;
  continuePractice: () => boolean;
  saveGuide: (id: string, progress: Partial<GuideProgress>) => void;
  selectLesson: (guideId: string, kind: LessonKind, targetId: string) => void;
  viewLesson: (guideId: string, branchId: string, ply: number) => void;
  startLesson: (guideId: string, kind: LessonKind, targetId: string, restart?: boolean) => void;
  helpLesson: (key: string, showHint?: boolean) => void;
  answerLesson: (key: string, move: string) => void;
  wrongLesson: (key: string) => void;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      ...emptyProgress(),
      hydrated: false,
      storageIssue: false,
      lessonNotice: null,
      startPractice(mode = 'daily') {
        if (!get().hydrated) return false;
        const active = get().currentSession;
        if (active && active.phase !== 'complete') return true;
        const now = new Date();
        const today = dateKey(now);
        const dailyDone = get().completions.some(
          (completion) => completion.dateKey === today && completion.mode === 'daily',
        );
        const selectedMode = mode === 'daily' && dailyDone ? 'extra' : mode;
        const id =
          selectedMode === 'daily'
            ? `daily-${today}`
            : `${selectedMode}-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
        const session = makeSession(id, selectedMode, today, get().attempts, get().level ?? 1);
        if (!session.puzzleIds.length) return false;
        set({ currentSession: session });
        return true;
      },
      setLevel(level) {
        set({ level });
      },
      startSkill(theme, rung) {
        if (!get().hydrated) return false;
        const active = get().currentSession;
        if (active && active.phase !== 'complete') {
          return active.skill?.theme === theme && active.skill.rung === rung;
        }
        const now = new Date();
        const run = get().skillProgress[theme]?.runs ?? 0;
        const session = makeSession(
          `skill-${theme}-${rung}-${now.getTime()}`,
          'skill',
          dateKey(now),
          get().attempts,
          get().level ?? 1,
          { theme, rung, run },
        );
        if (session.puzzleIds.length !== RUNG_SIZE) return false;
        set({ currentSession: session });
        return true;
      },
      startRoute() {
        if (!get().hydrated) return false;
        const active = get().currentSession;
        if (active && active.phase !== 'complete') return active.mode === 'route';
        const today = dateKey();
        if (get().routeRuns.some((run) => run.dateKey === today)) return false;
        set({
          currentSession: makeRouteSession(
            `route-${today}`,
            today,
            get().attempts,
            get().level ?? 1,
          ),
        });
        return true;
      },
      chooseRoute(steep) {
        const session = get().currentSession;
        if (session) set({ currentSession: chooseFork(session, steep) });
      },
      updateSettings(patch) {
        set({ settings: { ...get().settings, ...patch } });
      },
      recordVision(side, score) {
        set({ visionScores: recordScore(get().visionScores, side, score) });
      },
      answer(move) {
        const session = get().currentSession;
        if (!session || session.phase !== 'solve') return;
        const puzzle = puzzleById[session.puzzleIds[session.index]];
        const next = applyAnswer(session, puzzle, move);
        if (next === session) return;
        if (next.phase === 'feedback') {
          const result = attemptFor(session, puzzle.id, new Date());
          set({
            attempts: [...get().attempts, result],
            currentSession: { ...next, results: [...session.results, result] },
          });
        } else set({ currentSession: next });
      },
      hint() {
        const session = get().currentSession;
        if (session?.phase === 'solve' && !session.route?.choosing)
          set({
            currentSession: {
              ...session,
              hintsShown: Math.min(3, session.hintsShown + 1),
              usedHelp: true,
              lastWrong: false,
            },
          });
      },
      reveal() {
        const session = get().currentSession;
        if (session?.phase === 'solve' && !session.route?.choosing)
          set({
            currentSession: {
              ...session,
              phase: 'replay',
              ply: 0,
              hintsShown: 3,
              usedHelp: true,
              lastWrong: false,
            },
          });
      },
      replayStep(delta) {
        const session = get().currentSession;
        if (session?.phase !== 'replay') return;
        const puzzle = puzzleById[session.puzzleIds[session.index]];
        const ply = Math.max(0, Math.min(puzzle.moves.length, session.ply + delta));
        if (ply === puzzle.moves.length) {
          const result = { ...attemptFor(session, puzzle.id, new Date()), independent: false };
          set({
            attempts: [...get().attempts, result],
            currentSession: {
              ...session,
              ply,
              phase: 'feedback',
              acceptedFen: positionAfter(puzzle.fen, puzzle.moves),
              acceptedMove: puzzle.moves.at(-1)!,
              results: [...session.results, result],
            },
          });
        } else set({ currentSession: { ...session, ply } });
      },
      continuePractice() {
        const session = get().currentSession;
        if (session?.phase !== 'feedback') return false;
        const next = nextPuzzle(session);
        if (next.phase === 'complete') {
          const completion = {
            id: next.id,
            dateKey: dateKey(),
            independent: next.results.filter((result) => result.independent).length,
            total: next.results.length,
            mode: next.mode,
          };
          set({
            currentSession: next,
            completions: [...get().completions.filter((item) => item.id !== next.id), completion],
          });
          if (next.route) {
            set({
              routeRuns: recordRun(get().routeRuns, {
                dateKey: next.dateKey,
                score: routeScore(next.route.taken, next.results),
                steepTaken: next.route.taken.length,
                level: get().level ?? 1,
              }),
            });
          }
          if (next.skill) {
            const { theme, rung } = next.skill;
            const progress = get().skillProgress[theme] ?? { cleared: [], runs: 0 };
            const cleared =
              rungCleared(completion.independent) && !progress.cleared.includes(rung)
                ? [...progress.cleared, rung].sort()
                : progress.cleared;
            set({
              skillProgress: {
                ...get().skillProgress,
                [theme]: { cleared, runs: progress.runs + 1 },
              },
            });
          }
          return true;
        }
        set({ currentSession: next });
        return false;
      },
      saveGuide(id, patch) {
        const guide = guideById[id];
        if (!guide) return;
        const existing = get().guideProgress[id] ?? {
          viewedPly: 0,
          practicePly: guide.side === 'b' ? 1 : 0,
          completedAt: null,
        };
        const merged = { ...existing, ...patch };
        merged.viewedPly = Math.max(0, Math.min(guide.moves.length, merged.viewedPly));
        merged.practicePly = Math.max(0, Math.min(guide.moves.length, merged.practicePly));
        set({ guideProgress: { ...get().guideProgress, [id]: merged } });
      },
      selectLesson(guideId, kind, targetId) {
        if (!get().hydrated || !lessonTarget(guideId, kind, targetId)) return;
        const progress = get().lessonProgress;
        const key = lessonKey(kind, guideId, targetId);
        set({
          lessonNotice: null,
          lessonProgress: {
            ...progress,
            selected: {
              ...progress.selected,
              [guideId]: key,
            },
          },
        });
      },
      viewLesson(guideId, branchId, ply) {
        const branch = branchForGuide(guideId, branchId);
        if (!get().hydrated || !branch) return;
        const key = lessonKey('branch', guideId, branchId);
        get().helpLesson(key, false);
        const progress = get().lessonProgress;
        const viewedPly = Math.max(0, Math.min(branch.moves.length, ply));
        set({ lessonProgress: { ...progress, viewed: { ...progress.viewed, [key]: viewedPly } } });
        if (branchId === 'main') get().saveGuide(guideId, { viewedPly });
      },
      startLesson(guideId, kind, targetId, restart = false) {
        if (!get().hydrated) return;
        get().selectLesson(guideId, kind, targetId);
        const progress = get().lessonProgress;
        const key = lessonKey(kind, guideId, targetId);
        const existing = progress.sessions[key];
        if (existing && !restart) {
          return;
        }
        const session = beginLesson(
          guideId,
          kind,
          targetId,
          progress.attempts,
          new Date(),
          kind === 'branch' && targetId === 'main' ? get().guideProgress[guideId]?.practicePly : 0,
        );
        if (!session) return;
        set({
          lessonProgress: {
            ...progress,
            sessions: { ...progress.sessions, [key]: session },
            selected: { ...progress.selected, [guideId]: key },
          },
        });
      },
      helpLesson(key, showHint = true) {
        const progress = get().lessonProgress;
        const session = progress.sessions[key];
        if (!session || session.phase !== 'solve') return;
        set({
          lessonProgress: {
            ...progress,
            sessions: {
              ...progress.sessions,
              [key]: { ...session, usedHelp: true, hintShown: showHint || session.hintShown },
            },
          },
        });
      },
      wrongLesson(key) {
        const progress = get().lessonProgress;
        const session = progress.sessions[key];
        if (!session || session.phase !== 'solve') return;
        set({
          lessonProgress: {
            ...progress,
            sessions: {
              ...progress.sessions,
              [key]: wrongLessonMove(session),
            },
          },
        });
      },
      answerLesson(key, move) {
        const progress = get().lessonProgress;
        const session = progress.sessions[key];
        if (!session || session.phase !== 'solve') return;
        const next = answerLesson(session, move);
        const nextKey = lessonKey(next.kind, next.guideId, next.targetId);
        const destination = progress.sessions[nextKey];
        if (nextKey !== key && destination?.phase === 'solve' && destination.id !== session.id) {
          const target = lessonTarget(next.guideId, next.kind, next.targetId)!;
          set({
            lessonNotice: {
              key: nextKey,
              text: `Picking up where you left off in ${target.title}.`,
            },
            lessonProgress: {
              ...progress,
              selected: { ...progress.selected, [next.guideId]: nextKey },
            },
          });
          return;
        }
        const sessions = { ...progress.sessions };
        if (nextKey !== key) delete sessions[key];
        sessions[nextKey] = next;
        const result = next.phase === 'complete' ? lessonAttempt(next, new Date()) : undefined;
        const attempts =
          result && !progress.attempts.some((attempt) => attempt.id === result.id)
            ? [...progress.attempts, result]
            : progress.attempts;
        set({
          lessonNotice: null,
          lessonProgress: {
            ...progress,
            attempts,
            sessions,
            selected: { ...progress.selected, [next.guideId]: nextKey },
          },
        });
        if (next.kind === 'branch' && next.targetId === 'main') {
          get().saveGuide(next.guideId, {
            practicePly: next.ply,
            ...(result ? { completedAt: result.completedAt } : {}),
          });
        } else if (next.kind === 'branch' && result) {
          get().saveGuide(next.guideId, { completedAt: result.completedAt });
        }
      },
    }),
    {
      name: PROGRESS_KEY,
      version: 1,
      storage: createJSONStorage(() => progressStorage),
      partialize: ({
        attempts,
        completions,
        currentSession,
        guideProgress,
        lessonProgress,
        level,
        skillProgress,
        visionScores,
        routeRuns,
        settings,
      }) => ({
        attempts,
        completions,
        currentSession,
        guideProgress,
        lessonProgress,
        level,
        skillProgress,
        visionScores,
        routeRuns,
        settings,
      }),
      onRehydrateStorage: () => () => {
        useProgressStore.setState({ hydrated: true });
      },
    },
  ),
);

reportStorageIssues(() => {
  if (!useProgressStore.getState().storageIssue) useProgressStore.setState({ storageIssue: true });
});
