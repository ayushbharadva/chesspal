import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { format } from 'prettier';

import { INITIAL_POSITION, playMove, positionAfter, readPosition } from '../../src/chess';
import {
  type GuideLesson,
  type OpeningGuide,
  type TransferExercise,
} from '../../src/content/types';

const depth = 14;
const maximumLossCp = 35;
const contentPath = resolve('content/opening-practice.json');
type DraftTransfer = Omit<TransferExercise, 'fen' | 'verification'> &
  Partial<Pick<TransferExercise, 'fen' | 'verification'>>;
type DraftLesson = Omit<GuideLesson, 'transfers'> & { transfers: DraftTransfer[] };
const lessons: DraftLesson[] = JSON.parse(readFileSync(contentPath, 'utf8'));
const guides: OpeningGuide[] = JSON.parse(readFileSync(resolve('content/guides.json'), 'utf8'));

function positionKey(fen: string) {
  return fen.split(' ').slice(0, 4).join(' ');
}

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
  failure = new Error('Opening verification exceeded ten minutes');
  engine.kill();
  notify?.();
}, 600_000);

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

async function analyse(fen: string, move?: string) {
  engine.stdin.write('setoption name Clear Hash\nisready\n');
  await until((line) => line === 'readyok');
  engine.stdin.write(
    `position fen ${fen}\ngo depth ${depth}${move ? ` searchmoves ${move}` : ''}\n`,
  );
  const lines = await until((line) => line.startsWith('bestmove '));
  const bestMove = lines.at(-1)!.split(' ')[1];
  const scored = lines.filter(
    (line) =>
      Number(line.match(/\bdepth (\d+)/)?.[1]) >= depth &&
      /\bscore cp -?\d+/.test(line) &&
      !/\b(lowerbound|upperbound)\b/.test(line),
  );
  const scoreLine = scored.at(-1);
  if (!scoreLine || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(bestMove))
    throw new Error(`No exact depth-${depth} centipawn score: ${fen}`);
  if (move && bestMove !== move)
    throw new Error(`Engine did not search the requested answer ${move}`);
  return { bestMove, scoreCp: Number(scoreLine.match(/\bscore cp (-?\d+)/)![1]) };
}

async function main() {
  engine.stdin.write('uci\n');
  await until((line) => line === 'uciok');
  engine.stdin.write('setoption name Hash value 16\nsetoption name Threads value 1\nisready\n');
  await until((line) => line === 'readyok');
  for (const lesson of lessons) {
    const guide = guides.find((item) => item.id === lesson.guideId);
    if (!guide) throw new Error(`Unknown guide ${lesson.guideId}`);
    if (lesson.branches.length !== 2) throw new Error(`Expected two branches for ${guide.id}`);
    const seen = new Set<string>([positionKey(INITIAL_POSITION)]);
    for (const branch of [guide, ...lesson.branches]) {
      if (branch.notes.length !== branch.moves.length)
        throw new Error(`Missing notes for ${branch.id}`);
      let fen = INITIAL_POSITION;
      for (const move of branch.moves) {
        fen = playMove(fen, move).fen;
        seen.add(positionKey(fen));
      }
    }
    if (!lesson.transfers.length) throw new Error(`Missing transfer exercises for ${guide.id}`);
    for (const exercise of lesson.transfers) {
      const fen = positionAfter(INITIAL_POSITION, exercise.setupMoves);
      if (exercise.fen && exercise.fen !== fen)
        throw new Error(`Setup differs from saved FEN: ${exercise.id}`);
      if (readPosition(fen).turn !== guide.side)
        throw new Error(`Wrong learner side: ${exercise.id}`);
      if (seen.has(positionKey(fen)))
        throw new Error(`Transfer repeats a lesson position: ${exercise.id}`);
      if (!exercise.answers.length) throw new Error(`Missing answer: ${exercise.id}`);
      const best = await analyse(fen);
      const answers = [];
      for (const move of exercise.answers) {
        playMove(fen, move);
        const answer = await analyse(fen, move);
        const lossCp = Math.max(0, best.scoreCp - answer.scoreCp);
        console.log(
          `${exercise.id}: ${move}, best ${best.bestMove} ${best.scoreCp}cp, answer ${answer.scoreCp}cp, loss ${lossCp}cp`,
        );
        if (lossCp > maximumLossCp)
          throw new Error(
            `Unsound answer exceeds ${maximumLossCp}cp limit: ${exercise.id} ${move}`,
          );
        answers.push({ move, scoreCp: answer.scoreCp, lossCp });
      }
      exercise.fen = fen;
      exercise.verification = {
        engine: 'Stockfish 19 Lite',
        depth,
        checkedAt: new Date().toISOString(),
        bestMove: best.bestMove,
        bestScoreCp: best.scoreCp,
        answers,
      };
    }
  }
  if (!process.argv.includes('--check')) {
    writeFileSync(
      contentPath,
      await format(JSON.stringify(lessons), {
        parser: 'json',
        ...(JSON.parse(readFileSync(resolve('.prettierrc'), 'utf8')) as object),
      }),
    );
  }
  console.log(
    `Verified ${lessons.length * 2} opening branches and ${lessons.reduce((sum, lesson) => sum + lesson.transfers.length, 0)} transfer exercises at depth ${depth}, maximum loss ${maximumLossCp}cp.`,
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
