import { type PuzzleLevel } from '@/content/types';

export const LEVELS: readonly {
  value: PuzzleLevel;
  name: string;
  description: string;
}[] = [
  {
    value: 1,
    name: 'Beginner',
    description: 'I know how the pieces move and I am starting to play games.',
  },
  {
    value: 2,
    name: 'Easy',
    description: 'I play regularly and can spot a simple checkmate or free piece.',
  },
  {
    value: 3,
    name: 'Medium',
    description: 'Forks and pins are familiar and I want harder puzzles.',
  },
];

export function levelName(level: PuzzleLevel | null) {
  return LEVELS.find((item) => item.value === level)?.name ?? 'Beginner';
}
