import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { positionAfter } from '@/chess';
import { guideById, puzzleById } from '@/content';
import {
  emptyProgress,
  type GuideProgress,
  type PracticeMode,
  type SavedProgress,
} from '@/progress/types';
import { progressStorage, PROGRESS_KEY, reportStorageIssues } from '@/storage/storage';
import { dateKey } from '@/utils/date-key';
import { applyAnswer, attemptFor, makeSession, nextPuzzle } from '@/workout/session';

interface ProgressStore extends SavedProgress {
  hydrated: boolean;
  storageIssue: boolean;
  startPractice: (mode?: PracticeMode) => boolean;
  answer: (move: string) => void;
  hint: () => void;
  reveal: () => void;
  replayStep: (delta: number) => void;
  continuePractice: () => boolean;
  saveGuide: (id: string, progress: Partial<GuideProgress>) => void;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      ...emptyProgress(),
      hydrated: false,
      storageIssue: false,
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
        const session = makeSession(id, selectedMode, today, get().attempts);
        if (!session.puzzleIds.length) return false;
        set({ currentSession: session });
        return true;
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
        if (session?.phase === 'solve')
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
        if (session?.phase === 'solve')
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
    }),
    {
      name: PROGRESS_KEY,
      version: 1,
      storage: createJSONStorage(() => progressStorage),
      partialize: ({ attempts, completions, currentSession, guideProgress }) => ({
        attempts,
        completions,
        currentSession,
        guideProgress,
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
