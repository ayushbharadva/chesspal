import { puzzleById } from '@/content';
import {
  bestRun,
  KEPT_RUNS,
  planRoute,
  recordRun,
  ROUTE_MAX_SCORE,
  routePar,
  routePoints,
  routeScore,
  routeSteps,
  routeTheme,
  type RouteRun,
} from '@/daily-route/route';
import { PUZZLE_LEVELS, TOP_LEVEL } from '@/content/types';
import { applyAnswer, chooseFork, makeRouteSession, nextPuzzle } from '@/workout/session';

const DATE = '2026-10-31';
const run = (dateKey: string, score: number): RouteRun => ({
  dateKey,
  score,
  steepTaken: 0,
  level: 1,
});

describe('planRoute', () => {
  it.each(PUZZLE_LEVELS)('builds five themed puzzles at level %i', (level) => {
    const plan = planRoute(DATE, level, []);
    expect(plan.puzzleIds).toHaveLength(5);
    expect(plan.steepIds).toHaveLength(2);
    expect(new Set([...plan.puzzleIds, ...plan.steepIds]).size).toBe(7);
    for (const id of plan.puzzleIds) {
      expect(puzzleById[id].level).toBe(level);
      expect(puzzleById[id].themes).toContain(plan.theme);
    }
    const ratings = plan.puzzleIds.map((id) => puzzleById[id].rating);
    expect(ratings).toEqual([...ratings].sort((first, second) => first - second));
  });

  it('makes steep puzzles harder than safe ones on average', () => {
    const average = (ids: string[]) =>
      ids.reduce((sum, id) => sum + puzzleById[id].rating, 0) / ids.length;
    for (const level of PUZZLE_LEVELS) {
      const plan = planRoute(DATE, level, []);
      expect(average(plan.steepIds)).toBeGreaterThan(average(plan.puzzleIds));
    }
  });

  it('draws hard picks for the top level from that level', () => {
    const plan = planRoute(DATE, TOP_LEVEL, []);
    for (const id of plan.steepIds) expect(puzzleById[id].level).toBe(TOP_LEVEL);
  });

  it('is the same all day, changes by date and rotates through themes', () => {
    expect(planRoute(DATE, 1, [])).toEqual(planRoute(DATE, 1, []));
    expect(planRoute('2026-11-01', 1, []).puzzleIds).not.toEqual(planRoute(DATE, 1, []).puzzleIds);
    expect(routeTheme('2026-11-01')).not.toBe(routeTheme(DATE));
  });

  it('prefers puzzles the player has not seen', () => {
    const first = planRoute(DATE, 1, []);
    const attempts = [...first.puzzleIds, ...first.steepIds].map((puzzleId) => ({ puzzleId }));
    const second = planRoute(DATE, 1, attempts);
    expect(second.puzzleIds.filter((id) => first.puzzleIds.includes(id))).toEqual([]);
    expect(second.steepIds.filter((id) => first.steepIds.includes(id))).toEqual([]);
  });
});

describe('scoring', () => {
  it('rewards independent solves, and steep ones only without help', () => {
    expect(routePoints(false, true)).toBe(2);
    expect(routePoints(false, false)).toBe(1);
    expect(routePoints(true, true)).toBe(4);
    expect(routePoints(true, false)).toBe(0);
  });

  it('adds points by square and reaches the maximum on a flawless steep route', () => {
    const solved = Array.from({ length: 5 }, () => ({ independent: true }));
    expect(routeScore([1, 3], solved)).toBe(ROUTE_MAX_SCORE);
    expect(ROUTE_MAX_SCORE).toBe(14);
    expect(routeScore([], solved)).toBe(10);
    expect(routeScore([1], [solved[0], { independent: false }])).toBe(2);
  });

  it('hides par until three earlier runs, then takes their median', () => {
    expect(routePar([run('2026-10-01', 5), run('2026-10-02', 7)], DATE)).toBeNull();
    const runs = [run('2026-10-01', 5), run('2026-10-02', 7), run('2026-10-03', 12)];
    expect(routePar(runs, DATE)).toBe(7);
    expect(routePar([...runs, run('2026-10-04', 8)], DATE)).toBe(7.5);
  });

  it("leaves today's run out of par and an earlier best", () => {
    const runs = [run('2026-10-01', 5), run('2026-10-02', 5), run('2026-10-03', 5), run(DATE, 14)];
    expect(routePar(runs, DATE)).toBe(5);
    expect(bestRun(runs, DATE)).toBe(5);
    expect(bestRun(runs)).toBe(14);
    expect(bestRun([])).toBeNull();
  });

  it('keeps one run per date and drops the oldest', () => {
    expect(recordRun([run(DATE, 4)], run(DATE, 9))).toEqual([run(DATE, 9)]);
    const many = Array.from({ length: KEPT_RUNS }, (_, index) =>
      run(`2026-01-${String(index).padStart(2, '0')}`, index),
    );
    const kept = recordRun(many, run(DATE, 1));
    expect(kept).toHaveLength(KEPT_RUNS);
    expect(kept.at(-1)?.dateKey).toBe(DATE);
  });
});

describe('route sessions', () => {
  function solveCurrent(session: ReturnType<typeof makeRouteSession>) {
    return {
      ...session,
      phase: 'feedback' as const,
      results: [
        ...session.results,
        {
          id: `${session.id}:${session.index}`,
          puzzleId: session.puzzleIds[session.index],
          independent: true,
          dateKey: DATE,
          completedAt: `${DATE}T10:00:00.000Z`,
        },
      ],
    };
  }

  it('stops at both forks and swaps in the harder puzzle only on the steep path', () => {
    const start = makeRouteSession('route-test', DATE, [], 1);
    expect(start.route?.choosing).toBe(false);
    const fork = nextPuzzle(solveCurrent(start));
    expect(fork.index).toBe(1);
    expect(fork.route?.choosing).toBe(true);

    const safe = chooseFork(fork, false);
    expect(safe.puzzleIds).toEqual(start.puzzleIds);
    expect(safe.route).toMatchObject({ choosing: false, taken: [] });

    const steep = chooseFork(fork, true);
    expect(steep.puzzleIds[1]).toBe(start.route!.steepIds[0]);
    expect(steep.route).toMatchObject({ choosing: false, taken: [1] });

    const third = nextPuzzle(solveCurrent(steep));
    expect(third.route?.choosing).toBe(false);
    const secondFork = nextPuzzle(solveCurrent(third));
    expect(secondFork.index).toBe(3);
    expect(secondFork.route?.choosing).toBe(true);
    expect(chooseFork(secondFork, true).puzzleIds[3]).toBe(start.route!.steepIds[1]);
  });

  it('ignores answers while the player is choosing a path', () => {
    const fork = nextPuzzle(solveCurrent(makeRouteSession('route-test', DATE, [], 1)));
    const puzzle = puzzleById[fork.puzzleIds[1]];
    expect(applyAnswer(fork, puzzle, puzzle.moves[0])).toBe(fork);
  });

  it('describes each square for display', () => {
    const start = makeRouteSession('route-test', DATE, [], 1);
    expect(routeSteps(null).map((step) => step.state)).toEqual(Array(5).fill('upcoming'));
    expect(routeSteps(null).map((step) => step.fork)).toEqual([false, true, false, true, false]);
    const fork = chooseFork(nextPuzzle(solveCurrent(start)), true);
    const steps = routeSteps(fork);
    expect(steps[0]).toMatchObject({ state: 'done', points: 2 });
    expect(steps[1]).toMatchObject({ state: 'current', steep: true, points: null });
    expect(steps[2]).toMatchObject({ state: 'upcoming' });
  });
});
