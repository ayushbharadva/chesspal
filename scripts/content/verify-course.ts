import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { format } from 'prettier';

import { isDrillPosition, playMove } from '../../src/chess';
import { type CourseSection, type CourseStep } from '../../src/content/types';

const depth = 14;
/** The opening exercise rule: an answer may lose this much against the engine's best move. */
const maximumLossCp = 35;
/** Scripted replies show sensible defence; they may lose a little more than an answer. */
const maximumReplyLossCp = 100;
const MATE = 100_000;
/** Section 1 teaches the rules, where any legal way out of check or any castling is right. */
const RULES_SECTION = 'rules';
const files = [1, 2, 3, 4].map((number) => resolve(`content/course/section-${number}.json`));

const engine = spawn(
  process.execPath,
  [resolve('node_modules/stockfish/bin/stockfish-19-lite-single.js')],
  { stdio: ['pipe', 'pipe', 'inherit'] },
);
let buffer = '';
const pending: string[] = [];
let notify: (() => void) | undefined;
let failure: Error | undefined;
engine.stdout.on('data', (chunk: Buffer) => {
  buffer += chunk.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';
  pending.push(...lines.map((line) => line.trim()));
  notify?.();
});
engine.on('error', (error) => {
  failure = error;
  notify?.();
});
engine.on('exit', (code) => {
  failure = new Error(`Stockfish exited before verification finished (${code})`);
  notify?.();
});
const timeout = setTimeout(() => {
  failure = new Error('Course verification exceeded twenty minutes');
  engine.kill();
  notify?.();
}, 1_200_000);

async function until(predicate: (line: string) => boolean) {
  const received: string[] = [];
  while (true) {
    while (pending.length) {
      const line = pending.shift()!;
      received.push(line);
      if (predicate(line)) return received;
    }
    if (failure) throw failure;
    await new Promise<void>((done) => {
      notify = done;
    });
    notify = undefined;
  }
}

/** The side to move's score, with mates as large scores that prefer the faster mate. */
async function analyse(fen: string, move?: string) {
  engine.stdin.write('setoption name Clear Hash\nisready\n');
  await until((line) => line === 'readyok');
  engine.stdin.write(
    `position fen ${fen}\ngo depth ${depth}${move ? ` searchmoves ${move}` : ''}\n`,
  );
  const lines = await until((line) => line.startsWith('bestmove '));
  const bestMove = lines.at(-1)!.split(' ')[1];
  const scored = lines.filter(
    (line) => /\bscore (cp|mate) -?\d+/.test(line) && !/\b(lowerbound|upperbound)\b/.test(line),
  );
  const scoreLine = scored.at(-1);
  if (!scoreLine || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(bestMove))
    throw new Error(`No score: ${fen}`);
  if (move && bestMove !== move) throw new Error(`Engine did not search ${move} in ${fen}`);
  const [, kind, value] = scoreLine.match(/\bscore (cp|mate) (-?\d+)/)!;
  const number = Number(value);
  const scoreCp = kind === 'cp' ? number : Math.sign(number) * (MATE - Math.abs(number));
  return { bestMove, scoreCp };
}

async function check(fen: string, move: string, limit: number, label: string) {
  if (playMove(fen, move).checkmate) return;
  const best = await analyse(fen);
  // A second search of the engine's own choice can score it differently; it loses nothing.
  const answer = move === best.bestMove ? best : await analyse(fen, move);
  const loss = Math.max(0, best.scoreCp - answer.scoreCp);
  console.log(
    `${label}: ${move}, best ${best.bestMove} ${best.scoreCp}, this ${answer.scoreCp}, loss ${loss}`,
  );
  if (loss > limit) throw new Error(`${label}: ${move} loses ${loss}cp (best ${best.bestMove})`);
}

async function main() {
  engine.stdin.write('uci\n');
  await until((line) => line === 'uciok');
  engine.stdin.write('setoption name Hash value 16\nsetoption name Threads value 1\nisready\n');
  await until((line) => line === 'readyok');
  let checked = 0;
  for (const file of files) {
    const section: CourseSection = JSON.parse(readFileSync(file, 'utf8'));
    if (section.id === RULES_SECTION) continue;
    for (const unit of section.units)
      for (const lesson of unit.lessons)
        for (const [index, step] of lesson.steps.entries()) {
          if (step.kind !== 'move' || isDrillPosition(step.fen)) continue;
          const label = `${lesson.id} step ${index + 1}`;
          let fen = step.fen;
          for (const [ply, move] of step.line.entries()) {
            const player = ply % 2 === 0;
            const last = ply === step.line.length - 1;
            await check(fen, move, player ? maximumLossCp : maximumReplyLossCp, label);
            if (last)
              for (const other of step.alsoAccepted ?? [])
                await check(fen, other, maximumLossCp, label);
            fen = playMove(fen, move).fen;
          }
          (step as Extract<CourseStep, { kind: 'move' }>).verification = {
            engine: 'Stockfish 19 Lite',
            depth,
            checkedAt: new Date().toISOString(),
          };
          checked++;
        }
    if (!process.argv.includes('--check'))
      writeFileSync(
        file,
        await format(JSON.stringify(section), {
          parser: 'json',
          ...(JSON.parse(readFileSync(resolve('.prettierrc'), 'utf8')) as object),
        }),
      );
  }
  console.log(
    `Verified ${checked} course move steps at depth ${depth}, maximum loss ${maximumLossCp}cp.`,
  );
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
