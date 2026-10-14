import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { format } from 'prettier';

import { describeMove, PIECE_NAMES, playMove, positionAfter, readPosition } from '../../src/chess';
import { validatePuzzle } from '../../src/content/validate';
import { type Puzzle } from '../../src/content/types';

interface Candidate {
  PuzzleId: string;
  FEN: string;
  Moves: string;
  Rating: string;
  Themes: string;
  GameUrl: string;
  PrimaryMotif: string;
}
const candidates: Candidate[] = JSON.parse(
  readFileSync(resolve('content/puzzle-candidates.json'), 'utf8'),
);
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
const timeout = setTimeout(() => {
  engine.kill();
  throw new Error('Content verification exceeded ten minutes');
}, 600_000);

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
      engine.stdin.write(`position fen ${position}\ngo depth 14\n`);
      const analysis = await until((line) => line.startsWith('bestmove '));
      const best = analysis[analysis.length - 1].split(' ')[1];
      const completedDepth = analysis.reduce(
        (maximum, line) => Math.max(maximum, Number(line.match(/\bdepth (\d+)/)?.[1] ?? 0)),
        0,
      );
      depth = Math.min(depth, completedDepth);
      const expected = playMove(position, moves[ply]);
      if (best !== moves[ply] && !expected.checkmate) {
        verified = false;
        break;
      }
    }
    if (!verified) {
      console.log(`Skipped ambiguous candidate ${candidate.PuzzleId}`);
      continue;
    }
    const first = playMove(fen, moves[0]);
    const finalFen = positionAfter(fen, moves);
    const mate = readPosition(finalFen).checkmate;
    const fork = candidate.PrimaryMotif === 'fork';
    const motif = mate ? 'mate' : fork ? 'fork' : 'capture';
    const finalMove = playMove(
      positionAfter(fen, moves, moves.length - 1),
      moves[moves.length - 1],
    );
    const captured = finalMove.captured ? PIECE_NAMES[finalMove.captured] : null;
    const goal =
      motif === 'mate'
        ? moves.length === 1
          ? 'Find checkmate in one'
          : 'Find the checkmating line'
        : motif === 'fork'
          ? 'Find the fork and follow through'
          : 'Win the undefended material';
    const explanation = mate
      ? 'The final move checks the king, and there is no legal escape. Replay the line to see how the pieces cover the escape squares.'
      : fork
        ? `A fork creates more than one threat. Follow the reply${captured ? ` and capture the ${captured}` : ' to finish the combination'}.`
        : `Look for material you can win safely.${captured ? ` This line finishes by capturing the ${captured}.` : ' Follow the full line to finish the tactic.'}`;
    const puzzle: Puzzle = {
      id: candidate.PuzzleId,
      fen,
      moves,
      rating: Number(candidate.Rating),
      motif,
      goal,
      hints: [
        mate
          ? 'Check the opponent king and look at its escape squares.'
          : fork
            ? 'Look for a move that creates two threats at once.'
            : 'Look for a piece you can capture. Check the reply too.',
        `Consider your ${PIECE_NAMES[first.piece]} on ${first.from}.`,
        describeMove(fen, moves[0]),
      ],
      explanation,
      source: { puzzleId: candidate.PuzzleId, gameUrl: candidate.GameUrl, license: 'CC0-1.0' },
      verification: { engine: 'Stockfish 19 Lite', depth, checkedAt: new Date().toISOString() },
    };
    validatePuzzle(puzzle);
    puzzles.push(puzzle);
    console.log(`Verified ${puzzles.length}: ${puzzle.id} (${motif})`);
  }
  if (puzzles.length !== candidates.length || puzzles.length < 100)
    throw new Error('Replace failed candidates before rebuilding the 100-puzzle starter pack');
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
    clearTimeout(timeout);
    engine.stdin.write('quit\n');
    engine.kill();
  });
