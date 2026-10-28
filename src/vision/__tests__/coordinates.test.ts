import {
  ALL_SQUARES,
  bestScore,
  emptyVisionScores,
  KEPT_SCORES,
  nextTarget,
  recordScore,
  ROUND_SECONDS,
  secondsLeft,
} from '@/vision/coordinates';

it('lists all 64 squares and never repeats the previous target', () => {
  expect(new Set(ALL_SQUARES).size).toBe(64);
  expect(nextTarget(null, () => 0)).toBe('a1');
  expect(nextTarget('a1', () => 0)).toBe('a2');
  expect(nextTarget('h8', () => 0.9999)).toBe('h7');
});

it('keeps the most recent scores per side and reports the best', () => {
  let scores = emptyVisionScores();
  expect(bestScore(scores)).toBeNull();
  for (let score = 1; score <= KEPT_SCORES + 3; score += 1)
    scores = recordScore(scores, 'w', score);
  scores = recordScore(scores, 'b', 40);
  expect(scores.w).toHaveLength(KEPT_SCORES);
  expect(scores.w[0]).toBe(4);
  expect(bestScore(scores, 'w')).toBe(KEPT_SCORES + 3);
  expect(bestScore(scores)).toBe(40);
});

it('counts down whole seconds and stops at zero', () => {
  expect(secondsLeft(1000, 1000)).toBe(ROUND_SECONDS);
  expect(secondsLeft(1000, 1999)).toBe(ROUND_SECONDS);
  expect(secondsLeft(1000, 2000)).toBe(ROUND_SECONDS - 1);
  expect(secondsLeft(1000, 1000 + ROUND_SECONDS * 1000 + 5000)).toBe(0);
});
