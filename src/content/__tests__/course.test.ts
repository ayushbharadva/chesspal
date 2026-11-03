import {
  checkingSquares,
  drawReason,
  isDrillPosition,
  isSquareAttacked,
  legalMoves,
  playMove,
  readPosition,
  withTurn,
  type Square,
} from '@/chess';
import { puzzles } from '@/content';
import { courseLessons, courseSections } from '@/content/course';
import { type CourseStep } from '@/content/types';
import { defenderReply } from '@/course/defender';
import {
  captureDrillMove,
  collectStar,
  destinations,
  playOutcome,
  replyOutcome,
} from '@/course/steps';

const SQUARE = /^[a-h][1-8]$/;
const JARGON = /\b(independent|independently|recall|transfer|scaffold|assisted)\b/i;
/** Short, plain copy (decision 0007): a prompt or a sentence or two, never a paragraph. */
const MAX_TEXT = 160;

const steps = courseLessons.flatMap((entry) =>
  entry.lesson.steps.map((step, index) => ({ step, name: `${entry.lesson.id} step ${index + 1}` })),
);
function stepsOf<Kind extends CourseStep['kind']>(kind: Kind) {
  return steps.filter(
    (item): item is { step: Extract<CourseStep, { kind: Kind }>; name: string } =>
      item.step.kind === kind,
  );
}

function texts(step: CourseStep) {
  const list = [step.kind === 'read' ? step.text : step.prompt];
  if ('explanation' in step) list.push(step.explanation);
  if ('hint' in step) list.push(step.hint);
  if (step.kind === 'choice') list.push(...step.options);
  return list;
}

/** Fewest moves that collect every star (or take every piece safely), by breadth-first search. */
function fewestMoves(
  fen: string,
  done: (state: string) => boolean,
  next: (state: string) => string[],
) {
  let frontier = [fen];
  const seen = new Set(frontier);
  for (let moves = 0; moves <= 12; moves++) {
    if (frontier.some(done)) return moves;
    const following: string[] = [];
    for (const state of frontier)
      for (const candidate of next(state))
        if (!seen.has(candidate)) {
          seen.add(candidate);
          following.push(candidate);
        }
    frontier = following;
  }
  return Infinity;
}

describe('course content', () => {
  it('has unique ids and lessons with steps', () => {
    const ids = [
      ...courseSections.map((section) => section.id),
      ...courseSections.flatMap((section) => section.units.map((unit) => unit.id)),
      ...courseLessons.map((entry) => entry.lesson.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of courseLessons) {
      expect(entry.lesson.steps.length).toBeGreaterThanOrEqual(3);
      expect(entry.lesson.steps.length).toBeLessThanOrEqual(12);
    }
  });

  it('keeps every text short and plain', () => {
    for (const { step, name } of steps)
      for (const text of texts(step)) {
        expect([name, text.length <= MAX_TEXT]).toEqual([name, true]);
        expect([name, JARGON.test(text)]).toEqual([name, false]);
        expect([name, text.trim().length > 0]).toEqual([name, true]);
      }
  });

  it('uses readable positions and real squares', () => {
    for (const { step, name } of steps) {
      // Reading throws on a broken position, or on a full game that is not legal.
      if ('fen' in step && step.fen) expect(() => readPosition(step.fen!)).not.toThrow();
      const squares = [
        ...('marks' in step ? (step.marks ?? []) : []),
        ...('arrows' in step ? (step.arrows ?? []).flat() : []),
        ...(step.kind === 'stars' ? step.stars : []),
        ...(step.kind === 'tap' ? step.answers : []),
      ];
      for (const square of squares) expect([name, SQUARE.test(square)]).toEqual([name, true]);
    }
  });

  it('sets every star drill at exactly its fewest moves', () => {
    for (const { step, name } of stepsOf('stars')) {
      const pieces = readPosition(step.fen).pieces.map((piece) => piece.square);
      expect([name, step.stars.some((star) => pieces.includes(star as Square))]).toEqual([
        name,
        false,
      ]);
      const encode = (fen: string, remaining: readonly string[]) => `${fen}|${remaining.join(',')}`;
      const fewest = fewestMoves(
        encode(step.fen, step.stars),
        (state) => state.endsWith('|'),
        (state) => {
          const [fen, rest] = state.split('|');
          const remaining = rest ? rest.split(',') : [];
          return legalMoves(fen).map((move) => {
            const after = collectStar(fen, remaining, move.uci);
            return encode(after.fen, after.remaining);
          });
        },
      );
      expect([name, fewest]).toEqual([name, step.par]);
    }
  });

  it('sets every capture drill at exactly its fewest safe moves', () => {
    for (const { step, name } of stepsOf('capture')) {
      const fewest = fewestMoves(
        step.fen,
        (fen) => readPosition(fen).pieces.every((piece) => piece.color === readPosition(fen).turn),
        (fen) =>
          legalMoves(fen)
            .map((move) => captureDrillMove(fen, move.uci))
            .filter((move) => move.safe)
            .map((move) => move.fen),
      );
      expect([name, fewest]).toEqual([name, step.par]);
    }
  });

  it('checks tap answers against the board', () => {
    for (const { step, name } of stepsOf('tap')) {
      expect([name, new Set(step.answers).size]).toEqual([name, step.answers.length]);
      if (step.destinationsOf)
        expect([name, [...step.answers].sort()]).toEqual([
          name,
          destinations(step.fen, step.destinationsOf as Square),
        ]);
      if (step.checkers)
        expect([name, [...step.answers].sort()]).toEqual([name, checkingSquares(step.fen).sort()]);
    }
  });

  it('checks choice answers that state a position fact', () => {
    for (const { step, name } of stepsOf('choice')) {
      expect([name, step.answer >= 0 && step.answer < step.options.length]).toEqual([name, true]);
      const fact = step.fact;
      if (!fact) continue;
      expect([name, step.fen]).toEqual([name, expect.any(String)]);
      const fen = step.fen!;
      if ('status' in fact) {
        const position = readPosition(fen);
        const status = position.checkmate
          ? 'checkmate'
          : position.stalemate
            ? 'stalemate'
            : position.inCheck
              ? 'check'
              : 'none';
        expect([name, status]).toEqual([name, fact.status]);
      } else if ('move' in fact) {
        const legal = legalMoves(fen).some((move) => move.uci === fact.move);
        expect([name, legal]).toEqual([name, fact.legal]);
      } else if ('square' in fact) {
        expect([name, isSquareAttacked(fen, fact.square as Square, fact.by)]).toEqual([
          name,
          fact.attacked,
        ]);
      } else {
        expect([name, drawReason(fen) !== null]).toEqual([name, fact.drawn]);
      }
    }
  });

  it('plays every move line legally, and mates where the prompt asks for mate', () => {
    for (const { step, name } of stepsOf('move')) {
      expect([name, step.line.length % 2]).toEqual([name, 1]);
      let fen = step.fen;
      let beforeLast = fen;
      step.line.forEach((move, ply) => {
        if (ply === step.line.length - 1) beforeLast = fen;
        if (ply === step.line.length - 1)
          for (const other of step.alsoAccepted ?? [])
            expect([name, legalMoves(fen).some((candidate) => candidate.uci === other)]).toEqual([
              name,
              true,
            ]);
        fen = playMove(fen, move).fen;
      });
      const finals = [
        fen,
        ...(step.alsoAccepted ?? []).map((other) => playMove(beforeLast, other).fen),
      ];
      if (/checkmate|mate in one/i.test(step.prompt))
        for (const final of finals)
          expect([name, readPosition(final).checkmate]).toEqual([name, true]);
      else if (/give check/i.test(step.prompt))
        for (const final of finals)
          expect([name, readPosition(final).inCheck]).toEqual([name, true]);
      // A piece moved "to safety" must not stand on a square the other side attacks.
      if (/to safety/i.test(step.prompt))
        for (const final of finals) {
          const moved =
            (step.alsoAccepted ?? []).find((other) => playMove(beforeLast, other).fen === final) ??
            step.line.at(-1)!;
          expect([
            name,
            isSquareAttacked(
              withTurn(final, readPosition(beforeLast).turn),
              moved.slice(2, 4) as Square,
              readPosition(final).turn,
            ),
          ]).toEqual([name, false]);
        }
    }
  });

  it('beats the defender in every play step with the stored solution', () => {
    for (const { step, name } of stepsOf('play')) {
      expect([name, isDrillPosition(step.fen)]).toEqual([name, false]);
      let fen = step.fen;
      let outcome = 'ongoing';
      step.solution.forEach((move, index) => {
        if (outcome !== 'ongoing') return;
        const result = playOutcome(step, fen, move, index + 1);
        outcome = result.outcome;
        fen = result.fen;
        if (outcome !== 'ongoing') return;
        fen = playMove(fen, defenderReply(fen, step.goal)!).fen;
        outcome = replyOutcome(fen);
      });
      expect([name, outcome]).toEqual([name, 'won']);
      expect([name, step.solution.length <= step.limit]).toEqual([name, true]);
    }
  });

  it('has enough bundled puzzles for every puzzle step', () => {
    for (const { step, name } of stepsOf('puzzles')) {
      const available = puzzles.filter(
        (puzzle) => puzzle.level === step.level && puzzle.themes.includes(step.theme),
      );
      expect([name, available.length >= step.count * 3]).toEqual([name, true]);
    }
  });
});
