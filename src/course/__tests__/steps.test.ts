import { type CourseStep } from '@/content/types';
import { defenderReply } from '@/course/defender';
import {
  answerMoveStep,
  captureDrillMove,
  collectStar,
  destinations,
  parSlips,
  playOutcome,
  replyOutcome,
} from '@/course/steps';

type StepOf<Kind extends CourseStep['kind']> = Extract<CourseStep, { kind: Kind }>;

describe('move steps', () => {
  const step: StepOf<'move'> = {
    kind: 'move',
    prompt: 'Win the queen.',
    fen: '4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1',
    line: ['d1d5', 'e8e7', 'd5d4'],
    alsoAccepted: ['d5d3'],
    hint: 'Look along the d-file.',
    explanation: 'The rook takes the queen.',
  };

  it('accepts the line move, then hands back the scripted reply', () => {
    const answer = answerMoveStep(step, step.fen, 0, 'd1d5');
    expect(answer).toMatchObject({ accepted: true, reply: 'e8e7', finished: false });
  });

  it('rejects another move before the last one', () => {
    expect(answerMoveStep(step, step.fen, 0, 'd1d2').accepted).toBe(false);
  });

  it('accepts listed alternatives on the last move', () => {
    const after = '8/4k3/8/3R4/8/8/8/4K3 w - - 0 1';
    expect(answerMoveStep(step, after, 2, 'd5d3')).toMatchObject({
      accepted: true,
      finished: true,
    });
  });

  it('always accepts checkmate and ends the step', () => {
    const mate: StepOf<'move'> = {
      ...step,
      fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
      line: ['a1a8'],
    };
    expect(answerMoveStep(mate, mate.fen, 0, 'a1a8')).toMatchObject({
      accepted: true,
      finished: true,
    });
  });
});

describe('drills', () => {
  it('collects stars and keeps the turn with the player', () => {
    const first = collectStar('8/2R5/8/8/8/8/8/8 w - - 0 1', ['c5', 'g5'], 'c7c5');
    expect(first.remaining).toEqual(['g5']);
    expect(collectStar(first.fen, first.remaining, 'c5g5').remaining).toEqual([]);
  });

  it('marks a capture onto an attacked square as unsafe', () => {
    const fen = '8/8/8/8/P2r4/6B1/8/8 w - - 0 1';
    expect(captureDrillMove(fen, 'a4a5').safe).toBe(true);
    expect(captureDrillMove(fen, 'g3f4').safe).toBe(false);
    expect(captureDrillMove('8/8/8/8/3r4/6B1/8/8 w - - 0 1', 'g3d6').safe).toBe(false);
  });

  it('counts the last capture as safe', () => {
    expect(captureDrillMove('8/8/8/8/3r4/8/1B6/8 w - - 0 1', 'b2d4')).toMatchObject({
      safe: true,
      left: 0,
    });
  });

  it('gives one slip over par and lists legal destinations', () => {
    expect([parSlips(3, 3), parSlips(5, 3)]).toEqual([0, 1]);
    expect(destinations('8/8/8/8/8/8/8/N7 w - - 0 1', 'a1')).toEqual(['b3', 'c2']);
  });
});

describe('play steps', () => {
  const mate: StepOf<'play'> = {
    kind: 'play',
    prompt: 'Checkmate with the queen.',
    fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1',
    goal: 'checkmate',
    limit: 20,
    hint: 'Push the king to the edge.',
    solution: [],
  };

  it('wins on checkmate and draws on stalemate', () => {
    expect(playOutcome(mate, '7k/8/6K1/8/8/8/8/1Q6 w - - 0 1', 'b1b8', 3).outcome).toBe('won');
    expect(playOutcome(mate, '7k/8/5K2/8/8/8/8/6Q1 w - - 0 1', 'g1g6', 3).outcome).toBe('drawn');
  });

  it('stops at the move limit', () => {
    expect(playOutcome(mate, mate.fen, 'd1d2', 20).outcome).toBe('over-limit');
    expect(playOutcome(mate, mate.fen, 'd1d2', 3).outcome).toBe('ongoing');
  });

  it('counts a promotion only when the new piece is safe', () => {
    const race: StepOf<'play'> = { ...mate, goal: 'promote' };
    expect(playOutcome(race, '8/P7/8/8/8/8/k7/7K w - - 0 1', 'a7a8q', 1).outcome).toBe('won');
    expect(playOutcome(race, '1k6/P7/8/8/8/8/8/7K w - - 0 1', 'a7a8q', 1).outcome).toBe('drawn');
  });

  it('is drawn when the defender takes the last piece', () => {
    expect(replyOutcome('8/8/8/8/8/3k4/8/4K3 w - - 0 1')).toBe('drawn');
  });

  it('defends: takes a loose queen, avoids mate in one and heads for the pawn', () => {
    expect(defenderReply('8/8/8/4k3/4Q3/8/8/4K3 b - - 0 1', 'checkmate')).toBe('e5e4');
    // Kh8 allows Qb8 mate, so the king steps the other way.
    expect(defenderReply('6k1/8/6K1/8/8/8/8/1Q6 b - - 0 1', 'checkmate')).toBe('g8f8');
    expect(defenderReply('8/8/8/8/P7/8/8/4k2K b - - 0 1', 'promote')).toBe('e1d2');
  });
});
