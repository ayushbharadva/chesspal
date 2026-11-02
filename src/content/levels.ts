import { type PuzzleLevel } from '@/content/types';

export const LEVELS: readonly {
  value: PuzzleLevel;
  name: string;
  description: string;
}[] = [
  {
    value: 1,
    name: 'Beginner',
    description: 'I know how the pieces move.',
  },
  {
    value: 2,
    name: 'Easy',
    description: 'I play sometimes and spot simple tricks.',
  },
  {
    value: 3,
    name: 'Medium',
    description: 'Forks and pins feel familiar.',
  },
  {
    value: 4,
    name: 'Hard',
    description: 'I spot tactics in my own games.',
  },
  {
    value: 5,
    name: 'Expert',
    description: 'I want a real challenge.',
  },
];

export function levelName(level: PuzzleLevel | null) {
  return LEVELS.find((item) => item.value === level)?.name ?? 'Beginner';
}
