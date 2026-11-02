import { type RouteRun } from '@/daily-route/route';
import { type PuzzleLevel, type SkillTheme } from '@/content/types';
import { type Rung, type SkillProgressByLevel } from '@/skills/ladder';
import { emptyVisionScores, type VisionScores } from '@/vision/coordinates';

export interface Attempt {
  id: string;
  puzzleId: string;
  independent: boolean;
  dateKey: string;
  completedAt: string;
}

export type PracticeMode = 'daily' | 'extra' | 'review' | 'skill' | 'route';

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
  /** Present on skill ladder runs: the theme, rung, run number and level that seeded the puzzles. */
  skill?: { theme: SkillTheme; rung: Rung; run: number; level: PuzzleLevel };
  /** Present on daily routes: the harder puzzles on offer and the forks already taken. */
  route?: { theme: SkillTheme; steepIds: string[]; taken: number[]; choosing: boolean };
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

export type Appearance = 'system' | 'light' | 'dark';
export interface Settings {
  appearance: Appearance;
  haptics: boolean;
  sounds: boolean;
}
export function defaultSettings(): Settings {
  return { appearance: 'system', haptics: true, sounds: true };
}

export interface SavedProgress {
  attempts: Attempt[];
  completions: Completion[];
  currentSession: Session | null;
  guideProgress: Record<string, GuideProgress>;
  lessonProgress: LessonProgress;
  /** Chosen once by the player; null until then. */
  level: PuzzleLevel | null;
  skillProgress: SkillProgressByLevel;
  visionScores: VisionScores;
  routeRuns: RouteRun[];
  settings: Settings;
}

export function emptyProgress(): SavedProgress {
  return {
    attempts: [],
    completions: [],
    currentSession: null,
    guideProgress: {},
    lessonProgress: emptyLessonProgress(),
    level: null,
    skillProgress: {},
    visionScores: emptyVisionScores(),
    routeRuns: [],
    settings: defaultSettings(),
  };
}
