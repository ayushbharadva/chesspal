import { INITIAL_POSITION, legalMoves, playMove, positionAfter, readPosition } from '@/chess';
import { guides } from '@/content';
import {
  branchForGuide,
  branchesForGuide,
  lessonByGuideId,
  transferById,
  transfersForGuide,
} from '@/content/lessons';

function positionKey(fen: string) {
  return fen.split(' ').slice(0, 4).join(' ');
}

it('adds two sourced branches per guide while preserving each original main example', () => {
  expect(Object.keys(lessonByGuideId).sort()).toEqual(guides.map((guide) => guide.id).sort());
  for (const guide of guides) {
    const branches = branchesForGuide(guide.id);
    expect(branches).toHaveLength(3);
    expect(branchForGuide(guide.id, 'main')).toMatchObject({
      moves: guide.moves,
      notes: guide.notes,
      sourceUrl: guide.sourceUrl,
    });
    expect(new Set(branches.map((branch) => branch.id)).size).toBe(branches.length);
    expect(new Set(branches.map((branch) => branch.moves.join(' '))).size).toBe(branches.length);
    for (const branch of branches) {
      expect(branchForGuide(guide.id, branch.id)).toEqual(branch);
      expect(branch.notes).toHaveLength(branch.moves.length);
      expect(branch.notes.every((note) => note.trim().length > 15)).toBe(true);
      expect(branch.sourceUrl).toMatch(/^https:\/\/www\.chess\.com\/openings\//);
      expect(() => positionAfter(INITIAL_POSITION, branch.moves)).not.toThrow();
      expect(
        branch.moves.filter((_, ply) => ply % 2 === (guide.side === 'w' ? 0 : 1)).length,
      ).toBeGreaterThan(0);
    }
  }
});

it('returns empty results for unknown guides and no branch for an unknown branch id', () => {
  expect(branchesForGuide('unknown')).toEqual([]);
  expect(transfersForGuide('unknown')).toEqual([]);
  expect(branchForGuide(guides[0].id, 'unknown')).toBeUndefined();
});

it('provides two unfamiliar goal-specific transfer positions for each learner side', () => {
  const transfers = guides.flatMap((guide) => transfersForGuide(guide.id));
  expect(transfers).toHaveLength(6);
  expect(new Set(transfers.map((exercise) => exercise.id)).size).toBe(transfers.length);
  expect(Object.keys(transferById)).toHaveLength(transfers.length);
  for (const guide of guides) {
    const shown = new Set<string>([positionKey(INITIAL_POSITION)]);
    for (const branch of branchesForGuide(guide.id)) {
      let fen = INITIAL_POSITION;
      for (const move of branch.moves) {
        fen = playMove(fen, move).fen;
        shown.add(positionKey(fen));
      }
    }
    for (const exercise of transfersForGuide(guide.id)) {
      expect(transferById[exercise.id]).toEqual(exercise);
      expect(positionAfter(INITIAL_POSITION, exercise.setupMoves)).toBe(exercise.fen);
      expect(readPosition(exercise.fen).turn).toBe(guide.side);
      expect(shown.has(positionKey(exercise.fen))).toBe(false);
      const legal = legalMoves(exercise.fen).map((move) => move.uci);
      expect(exercise.answers.length).toBeGreaterThan(0);
      expect(new Set(exercise.answers).size).toBe(exercise.answers.length);
      expect(exercise.answers.every((move) => legal.includes(move))).toBe(true);
      expect(exercise.prompt).toMatch(/to play:/);
      expect(exercise.sourceUrl).toMatch(/^https:\/\/www\.chess\.com\/openings\//);
    }
  }
});

it('records actual depth-14 goal-answer scores within the conservative 35cp soundness limit', () => {
  for (const exercise of Object.values(transferById)) {
    const verification = exercise.verification;
    expect(verification.engine).toBe('Stockfish 19 Lite');
    expect(verification.depth).toBeGreaterThanOrEqual(14);
    expect(Number.isFinite(Date.parse(verification.checkedAt))).toBe(true);
    expect(Number.isFinite(verification.bestScoreCp)).toBe(true);
    expect(legalMoves(exercise.fen).some((move) => move.uci === verification.bestMove)).toBe(true);
    expect(verification.answers.map((answer) => answer.move)).toEqual(exercise.answers);
    for (const answer of verification.answers) {
      expect(Number.isFinite(answer.scoreCp)).toBe(true);
      expect(answer.lossCp).toBe(Math.max(0, verification.bestScoreCp - answer.scoreCp));
      expect(answer.lossCp).toBeLessThanOrEqual(35);
    }
  }
});
