import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { format } from 'prettier';

import { describeMove, PIECE_NAMES, playMove, positionAfter } from '../../src/chess';
import { validatePuzzle } from '../../src/content/validate';
import {
  SKILL_THEMES,
  type Puzzle,
  type PuzzleLevel,
  type SkillTheme,
} from '../../src/content/types';

interface Candidate {
  PuzzleId: string;
  FEN: string;
  Moves: string;
  Rating: string;
  Themes: string;
  GameUrl: string;
  PrimaryTheme: SkillTheme;
  Existing?: boolean;
}
interface SkillCopy {
  id: SkillTheme;
  goal: string;
  hint: string;
}
const candidates: Candidate[] = JSON.parse(
  readFileSync(resolve('content/puzzle-candidates.json'), 'utf8'),
);
const previous: Puzzle[] = JSON.parse(readFileSync(resolve('content/puzzles.json'), 'utf8'));
const copy = Object.fromEntries(
  (JSON.parse(readFileSync(resolve('content/skills.json'), 'utf8')).skills as SkillCopy[]).map(
    (skill) => [skill.id, skill],
  ),
) as Record<SkillTheme, SkillCopy>;
const engine = spawn(
  process.execPath,
  [resolve('node_modules/stockfish/bin/stockfish-19-lite-single.js')],
  { stdio: ['pipe', 'pipe', 'inherit'] },
);
let buffer = '';
let lines: string[] = [];
let notify: (() => void) | undefined;
engine.stdout.on('data', (chunk: Buffer) => {
  buffer += chunk.toString();
  const complete = buffer.split('\n');
  buffer = complete.pop() ?? '';
  lines.push(...complete.map((line) => line.trim()));
  notify?.();
});
engine.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

function levelFor(rating: number): PuzzleLevel {
  return rating < 700 ? 1 : rating < 1000 ? 2 : rating < 1300 ? 3 : rating < 1600 ? 4 : 5;
}
// Original explanations, built only from verified facts: the final capture or mate.
function explain(theme: SkillTheme, captured: string | null) {
  const finish = captured ? ` The line finishes by winning the ${captured}.` : '';
  switch (theme) {
    case 'mateIn1':
      return 'The move gives check and the king has no legal escape. Look at which pieces cover the squares around the king.';
    case 'backRankMate':
      return "The king's own pawns block its escape, so a check along the back rank is checkmate.";
    case 'mateIn2':
      return 'The first move forces the reply, and the second move delivers checkmate. Replay the line to see why the opponent had no better answer.';
    case 'hangingPiece':
      return `That piece had no defender, so taking it wins material.${finish}`;
    case 'fork':
      return `One move created two threats, and the opponent could only answer one of them.${finish}`;
    case 'pin':
      return `The pinned piece could not move without exposing something more valuable behind it.${finish}`;
    case 'skewer':
      return `The attacked piece had to move out of the way, leaving the piece behind it unprotected.${finish}`;
    case 'discoveredAttack':
      return `Moving one piece uncovered an attack from another, so the opponent faced two threats at once.${finish}`;
  }
}

function lesson(base: Omit<Puzzle, 'goal' | 'hints' | 'explanation'>): Puzzle {
  const first = playMove(base.fen, base.moves[0]);
  const finalMove = playMove(
    positionAfter(base.fen, base.moves, base.moves.length - 1),
    base.moves[base.moves.length - 1],
  );
  const captured = finalMove.captured ? PIECE_NAMES[finalMove.captured] : null;
  return {
    ...base,
    goal: copy[base.theme].goal,
    hints: [
      copy[base.theme].hint,
      `Consider your ${PIECE_NAMES[first.piece]} on ${first.from}.`,
      describeMove(base.fen, base.moves[0]),
    ],
    explanation: explain(base.theme, captured),
  };
}

async function until(predicate: (line: string) => boolean) {
  const received: string[] = [];
  while (true) {
    while (lines.length) {
      const line = lines.shift()!;
      received.push(line);
      if (predicate(line)) return received;
    }
    await new Promise<void>((done) => {
      notify = done;
    });
    notify = undefined;
  }
}

async function bestMove(position: string) {
  engine.stdin.write(`position fen ${position}\ngo depth 14\n`);
  const analysis = await Promise.race([
    until((line) => line.startsWith('bestmove ')),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Engine timed out on ${position}`)), 60_000),
    ),
  ]);
  return {
    move: analysis[analysis.length - 1].split(' ')[1],
    depth: analysis.reduce(
      (maximum, line) => Math.max(maximum, Number(line.match(/\bdepth (\d+)/)?.[1] ?? 0)),
      0,
    ),
  };
}

async function main() {
  engine.stdin.write('uci\n');
  await until((line) => line === 'uciok');
  engine.stdin.write('setoption name Hash value 16\nisready\n');
  await until((line) => line === 'readyok');
  const puzzles: Puzzle[] = [];
  for (const candidate of candidates) {
    const sourceMoves = candidate.Moves.split(' ');
    const fen = playMove(candidate.FEN, sourceMoves[0]).fen;
    const moves = sourceMoves.slice(1);
    let depth = 99;
    let verified = true;
    for (let ply = 0; ply < moves.length; ply += 2) {
      const position = positionAfter(fen, moves, ply);
      const best = await bestMove(position);
      depth = Math.min(depth, best.depth);
      if (best.move !== moves[ply] && !playMove(position, moves[ply]).checkmate) {
        verified = false;
        break;
      }
    }
    if (!verified) {
      console.log(`Skipped ambiguous candidate ${candidate.PuzzleId}`);
      continue;
    }
    const tags = candidate.Themes.split(' ');
    const themes = SKILL_THEMES.filter(
      (theme) => theme === candidate.PrimaryTheme || tags.includes(theme),
    );
    const puzzle = lesson({
      id: candidate.PuzzleId,
      fen,
      moves,
      rating: Number(candidate.Rating),
      level: levelFor(Number(candidate.Rating)),
      theme: candidate.PrimaryTheme,
      themes,
      source: { puzzleId: candidate.PuzzleId, gameUrl: candidate.GameUrl, license: 'CC0-1.0' },
      verification: { engine: 'Stockfish 19 Lite', depth, checkedAt: new Date().toISOString() },
    });
    validatePuzzle(puzzle);
    puzzles.push(puzzle);
    if (puzzles.length % 50 === 0)
      console.log(`Verified ${puzzles.length} of ${candidates.length}`);
  }
  // Saved attempts refer to earlier puzzles by id, so every bundled puzzle must stay.
  const kept = new Set(puzzles.map((puzzle) => puzzle.id));
  const missing = previous.filter((puzzle) => !kept.has(puzzle.id));
  if (missing.length)
    throw new Error(`Bundled puzzles failed or were not imported: ${missing.map((p) => p.id)}`);
  const counts: Record<string, number> = {};
  for (const puzzle of puzzles)
    for (const theme of puzzle.themes)
      counts[`${theme}/${puzzle.level}`] = (counts[`${theme}/${puzzle.level}`] ?? 0) + 1;
  console.table(counts);
  writeFileSync(
    resolve('content/puzzles.json'),
    await format(JSON.stringify(puzzles.sort((first, second) => first.rating - second.rating)), {
      parser: 'json',
      ...(JSON.parse(readFileSync(resolve('.prettierrc'), 'utf8')) as object),
    }),
  );
  console.log(`Bundled ${puzzles.length} engine-verified puzzles`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    engine.stdin.write('quit\n');
    engine.kill();
  });
