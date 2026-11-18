import { type CourseResult } from '@/course/path';
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
  /** A wrong move with no stored reply: shake and say try again. */
  lastWrong: boolean;
  /** A wrong move on the board with the opponent's stored reply, until Back one move or Reset. */
  wrongMove: string | null;
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

/** The Learn lesson being played: the step reached and slips so far. */
export interface CourseRun {
  lessonId: string;
  /** Equal to the lesson's step count once every step is done. */
  step: number;
  slips: number;
}
export interface CourseProgress {
  results: CourseResult[];
  current: CourseRun | null;
}
export function emptyCourseProgress(): CourseProgress {
  return { results: [], current: null };
}

export type Appearance = 'system' | 'light' | 'dark';
/** Piece designs the player can choose in Settings; the artwork is in src/components/board. */
export const PIECE_SETS = ['classic', 'modern', 'wood'] as const;
export type PieceSetId = (typeof PIECE_SETS)[number];
export interface Settings {
  appearance: Appearance;
  haptics: boolean;
  sounds: boolean;
  pieceSet: PieceSetId;
}
export function defaultSettings(): Settings {
  return { appearance: 'system', haptics: true, sounds: true, pieceSet: 'classic' };
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
  courseProgress: CourseProgress;
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
    courseProgress: emptyCourseProgress(),
    settings: defaultSettings(),
  };
}
