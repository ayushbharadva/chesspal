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

export interface SavedProgress {
  attempts: Attempt[];
  completions: Completion[];
  currentSession: Session | null;
  guideProgress: Record<string, GuideProgress>;
}

export function emptyProgress(): SavedProgress {
  return { attempts: [], completions: [], currentSession: null, guideProgress: {} };
}
