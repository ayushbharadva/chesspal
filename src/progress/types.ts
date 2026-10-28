export interface Attempt {
  id: string;
  puzzleId: string;
  independent: boolean;
  dateKey: string;
  completedAt: string;
}

export type PracticeMode = 'daily' | 'extra' | 'review';

export interface Session {
  id: string;
  mode: PracticeMode;
  dateKey: string;
  puzzleIds: string[];
  index: number;
  ply: number;
  phase: 'solve' | 'replay' | 'feedback' | 'complete';
  hintsShown: number;
  usedHelp: boolean;
  mistakes: number;
  lastWrong: boolean;
  acceptedFen: string | null;
  acceptedMove: string | null;
  results: Attempt[];
}

export interface GuideProgress {
  viewedPly: number;
  practicePly: number;
  completedAt: string | null;
}

export interface Completion {
  id: string;
  dateKey: string;
  independent: number;
  total: number;
  mode: PracticeMode;
}

export type LessonKind = 'branch' | 'transfer';
export interface LessonAttempt {
  id: string;
  guideId: string;
  targetId: string;
  kind: LessonKind;
  independent: boolean;
  dateKey: string;
  completedAt: string;
}
export interface LessonSession {
  id: string;
  guideId: string;
  targetId: string;
  kind: LessonKind;
  ply: number;
  phase: 'solve' | 'complete';
  scaffold: 'guided' | 'recall';
  usedHelp: boolean;
  hintShown: boolean;
  mistakes: number;
  lastWrong: boolean;
  acceptedMove: string | null;
}
export interface LessonProgress {
  attempts: LessonAttempt[];
  sessions: Record<string, LessonSession>;
  selected: Record<string, string>;
  viewed: Record<string, number>;
}
export function emptyLessonProgress(): LessonProgress {
  return { attempts: [], sessions: {}, selected: {}, viewed: {} };
}

export interface SavedProgress {
  attempts: Attempt[];
  completions: Completion[];
  currentSession: Session | null;
  guideProgress: Record<string, GuideProgress>;
  lessonProgress: LessonProgress;
}

export function emptyProgress(): SavedProgress {
  return {
    attempts: [],
    completions: [],
    currentSession: null,
    guideProgress: {},
    lessonProgress: emptyLessonProgress(),
  };
}
