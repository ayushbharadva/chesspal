import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname, resolve } from 'node:path';
import { format } from 'prettier';

import { legalMoves, playMove, positionAfter } from '../../src/chess';
import {
  MATE_THEMES,
  REFUTATION_REASON_LETTERS,
  type Puzzle,
  type RefutationReason,
} from '../../src/content/types';

/**
 * For every wrong move in every bundled puzzle, finds the opponent's best reply with Stockfish
 * and why the move fails, as a reason code. The app turns codes into words.
 *
 *   npm run content:refutations                  all puzzles, into content/refutations.json
 *   npm run content:refutations -- --sample 50   50 puzzles spread across ratings, with timings
 *   --depth 14 --engines 3 --out path            search depth, parallel engines, output file
 *
 * Progress is saved after each puzzle to `<out>.progress.jsonl`, so a stopped run resumes.
 * Saved rows with another depth or threshold are redone; after editing this script, delete the file.
 *
 * Output: puzzle id → one string per player move (ply 0, 2, 4…). Each string lists the wrong
 * moves, space-separated, as wrong move + reply (both UCI, reply missing when there is none) +
 * reason letter. `f4f5e6f5c` is f4–f5, answered by e6xf5, reason capture.
 */

/** The reply in UCI, or null when the wrong move ends the game or still wins. */
type Refutation = [reply: string | null, reason: RefutationReason];

const MATE_SCORE = 100_000;

function option(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const sampleSize = option('sample') ? Number(option('sample')) : undefined;
const depth = Number(option('depth') ?? 14);
/** A wrong move that leaves the player this far ahead (in hundredths of a pawn) still wins. */
const alsoGoodThresholdCp = Number(option('also-good') ?? 300);
const engineCount = Number(option('engines') ?? Math.max(1, availableParallelism() - 1));
const outputPath = resolve(
  option('out') ?? (sampleSize ? 'content/refutations.sample.json' : 'content/refutations.json'),
);
const progressPath = `${outputPath}.progress.jsonl`;
const settings = `depth ${depth}, also good ${alsoGoodThresholdCp}`;

const allPuzzles: Puzzle[] = JSON.parse(readFileSync(resolve('content/puzzles.json'), 'utf8'));
// Puzzles are sorted by rating, so every nth puzzle spreads a sample across all levels.
const puzzles = sampleSize
  ? allPuzzles.filter((_, index) => index % Math.floor(allPuzzles.length / sampleSize) === 0)
  : allPuzzles;

class Engine {
  private process: ChildProcessWithoutNullStreams;
  private buffer = '';
  private pending: string[] = [];
  private notify: (() => void) | undefined;
  private failure: Error | undefined;

  constructor() {
    this.process = spawn(process.execPath, [
      resolve('node_modules/stockfish/bin/stockfish-19-lite-single.js'),
    ]);
    this.process.stdout.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString();
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop() ?? '';
      this.pending.push(...lines.map((line) => line.trim()));
      this.notify?.();
    });
    this.process.on('exit', (code) => {
      this.failure ??= new Error(`Stockfish exited (${code})`);
      this.notify?.();
    });
  }

  private async until(predicate: (line: string) => boolean) {
    const received: string[] = [];
    while (true) {
      while (this.pending.length) {
        const line = this.pending.shift()!;
        received.push(line);
        if (predicate(line)) return received;
      }
      if (this.failure) throw this.failure;
      await new Promise<void>((done) => {
        this.notify = done;
      });
      this.notify = undefined;
    }
  }

  async start() {
    this.process.stdin.write('uci\n');
    await this.until((line) => line === 'uciok');
    this.process.stdin.write('setoption name Hash value 16\nsetoption name Threads value 1\n');
  }

  /** The best move and the side to move's score; mates count as huge scores. */
  async analyse(fen: string) {
    // A fresh hash for each position keeps results the same from run to run.
    this.process.stdin.write('ucinewgame\nisready\n');
    await this.until((line) => line === 'readyok');
    this.process.stdin.write(`position fen ${fen}\ngo depth ${depth}\n`);
    const lines = await this.until((line) => line.startsWith('bestmove '));
    const bestMove = lines.at(-1)!.split(' ')[1];
    const scoreLine = lines
      .filter(
        (line) => /\bscore (cp|mate) -?\d+/.test(line) && !/\b(lower|upper)bound\b/.test(line),
      )
      .at(-1);
    if (!scoreLine || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(bestMove))
      throw new Error(`No score for ${fen}`);
    const [, kind, value] = scoreLine.match(/\bscore (cp|mate) (-?\d+)/)!;
    const number = Number(value);
    const scoreCp = kind === 'cp' ? number : Math.sign(number) * (MATE_SCORE - Math.abs(number));
    return { bestMove, scoreCp };
  }

  stop() {
    this.process.stdin.write('quit\n');
    this.process.kill();
  }
}

interface PuzzleResult {
  id: string;
  settings: string;
  /** Ply, then wrong move, then its refutation. */
  plies: Record<string, Record<string, Refutation>>;
  /** For the sample report only: the player's score after each wrong move, and timings. */
  scores?: number[];
  searches: number;
  milliseconds: number;
}

function reasonForReply(puzzle: Puzzle, fen: string, reply: string): RefutationReason {
  const result = playMove(fen, reply);
  if (result.checkmate) return 'mate';
  if (result.captured) return 'capture';
  if (MATE_THEMES.includes(puzzle.theme) && result.piece === 'k') return 'escape';
  return 'defend';
}

async function refutePuzzle(engine: Engine, puzzle: Puzzle): Promise<PuzzleResult> {
  const started = Date.now();
  const plies: PuzzleResult['plies'] = {};
  const scores: number[] = [];
  let searches = 0;
  for (let ply = 0; ply < puzzle.moves.length; ply += 2) {
    const fen = positionAfter(puzzle.fen, puzzle.moves, ply);
    const refutations: Record<string, Refutation> = {};
    for (const { uci } of legalMoves(fen)) {
      if (uci === puzzle.moves[ply]) continue;
      const after = playMove(fen, uci);
      // Any checkmate is accepted as a correct answer.
      if (after.checkmate) continue;
      if (after.stalemate) {
        refutations[uci] = [null, 'stalemate'];
        continue;
      }
      const { bestMove, scoreCp } = await engine.analyse(after.fen);
      searches++;
      // The engine scores for the opponent, who moves next.
      const playerScore = -scoreCp;
      scores.push(playerScore);
      refutations[uci] =
        playerScore >= alsoGoodThresholdCp
          ? [null, 'alsoGood']
          : [bestMove, reasonForReply(puzzle, after.fen, bestMove)];
    }
    plies[ply] = refutations;
  }
  return {
    id: puzzle.id,
    settings,
    plies,
    ...(sampleSize ? { scores } : {}),
    searches,
    milliseconds: Date.now() - started,
  };
}

/** One ply's wrong moves as `wrong + reply + reason letter`, space-separated. */
function encodePly(refutations: Record<string, Refutation>) {
  return Object.entries(refutations)
    .map(([wrong, [reply, reason]]) => `${wrong}${reply ?? ''}${REFUTATION_REASON_LETTERS[reason]}`)
    .join(' ');
}

function readProgress() {
  if (!existsSync(progressPath)) return new Map<string, PuzzleResult>();
  const lines = readFileSync(progressPath, 'utf8').split('\n').filter(Boolean);
  const rows = lines.map((line) => JSON.parse(line) as PuzzleResult);
  return new Map(rows.filter((row) => row.settings === settings).map((row) => [row.id, row]));
}

function report(results: PuzzleResult[], wallMilliseconds: number) {
  const searches = results.reduce((total, row) => total + row.searches, 0);
  const engineMilliseconds = results.reduce((total, row) => total + row.milliseconds, 0);
  const reasons: Record<string, number> = {};
  for (const row of results)
    for (const ply of Object.values(row.plies))
      for (const [, reason] of Object.values(ply)) reasons[reason] = (reasons[reason] ?? 0) + 1;
  const scores = results.flatMap((row) => row.scores ?? []);
  const between = (low: number, high: number) =>
    scores.filter((score) => score >= low && score < high).length;
  const perPuzzle = searches / results.length;
  console.log(`Puzzles: ${results.length}, searches: ${searches} (${perPuzzle.toFixed(1)} each)`);
  console.log(`Depth ${depth}: ${(engineMilliseconds / searches).toFixed(0)} ms per search`);
  console.log(`Wall time: ${(wallMilliseconds / 1000).toFixed(0)} s with ${engineCount} engines`);
  console.log(
    `Full set estimate: ${((allPuzzles.length * perPuzzle * engineMilliseconds) / searches / 3_600_000).toFixed(1)} engine-hours`,
  );
  console.table(reasons);
  if (scores.length)
    console.table({
      'losing (< 0)': between(-Infinity, 0),
      'level (0–99)': between(0, 100),
      'ahead (100–299)': between(100, 300),
      'well ahead (300–999)': between(300, 1000),
      'winning (1000+, mates)': between(1000, Infinity),
    });
}

const engines: Engine[] = [];

async function main() {
  mkdirSync(dirname(outputPath), { recursive: true });
  const done = readProgress();
  const queue = puzzles.filter((puzzle) => !done.has(puzzle.id));
  console.log(`${puzzles.length} puzzles, ${done.size} done, ${queue.length} to go`);
  const started = Date.now();
  engines.push(...Array.from({ length: Math.min(engineCount, queue.length) }, () => new Engine()));
  await Promise.all(engines.map((engine) => engine.start()));
  let finished = 0;
  await Promise.all(
    engines.map(async (engine) => {
      for (let puzzle = queue.shift(); puzzle; puzzle = queue.shift()) {
        const result = await refutePuzzle(engine, puzzle);
        appendFileSync(progressPath, `${JSON.stringify(result)}\n`);
        done.set(result.id, result);
        if (++finished % 10 === 0) console.log(`Finished ${finished}`);
      }
    }),
  );

  const results = puzzles.map((puzzle) => done.get(puzzle.id)!);
  const output = Object.fromEntries(
    [...results]
      .sort((first, second) => first.id.localeCompare(second.id))
      .map((row) => [row.id, Object.values(row.plies).map(encodePly)]),
  );
  writeFileSync(
    outputPath,
    await format(JSON.stringify(output), {
      parser: 'json',
      ...(JSON.parse(readFileSync(resolve('.prettierrc'), 'utf8')) as object),
    }),
  );
  report(results, Date.now() - started);
  console.log(`Wrote ${outputPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  // Stop every engine, or a failed run keeps running in the background.
  .finally(() => engines.forEach((engine) => engine.stop()));
