import { REFUTATION_REASON_LETTERS, type RefutationReason } from '@/content/types';

/** The opponent's reply to a wrong move (null when there is none) and why the move fails. */
export interface Refutation {
  reply: string | null;
  reason: RefutationReason;
}

type RefutationData = Record<string, string[]>;

const REASON_BY_LETTER = Object.fromEntries(
  Object.entries(REFUTATION_REASON_LETTERS).map(([reason, letter]) => [letter, reason]),
) as Record<string, RefutationReason>;
// A UCI move: from square, to square, then an optional promotion letter.
const TOKEN = /^([a-h][1-8][a-h][1-8][qrbn]?)([a-h][1-8][a-h][1-8][qrbn]?)?([a-z])$/;

/** Reads one position's line, `wrong + reply + reason letter` per wrong move, space-separated. */
export function parseRefutationLine(line: string) {
  const refutations = new Map<string, Refutation>();
  for (const token of line.split(' ').filter(Boolean)) {
    const match = token.match(TOKEN);
    const reason = match && REASON_BY_LETTER[match[3]];
    if (!match || !reason) throw new Error(`Unreadable refutation: ${token}`);
    refutations.set(match[1], { reply: match[2] ?? null, reason });
  }
  return refutations;
}

let data: RefutationData | undefined;
const parsed = new Map<string, Map<string, Refutation>>();

/** Loads the 1.7 MB file on the first wrong move rather than at app start. */
function refutationData() {
  data ??= require('../../content/refutations.json') as RefutationData;
  return data;
}

/** Puzzle ids with stored replies, for tests. */
export function refutedPuzzleIds() {
  return Object.keys(refutationData());
}

/** Every stored wrong move at one player move of a puzzle, or undefined if none are stored. */
export function refutationsAt(puzzleId: string, ply: number) {
  const key = `${puzzleId}/${ply}`;
  if (!parsed.has(key)) {
    const line = ply % 2 === 0 ? refutationData()[puzzleId]?.[ply / 2] : undefined;
    if (line === undefined) return undefined;
    parsed.set(key, parseRefutationLine(line));
  }
  return parsed.get(key);
}

/** The stored reply to a wrong move, or undefined when the move has none (use a plain retry). */
export function refutationFor(puzzleId: string, ply: number, move: string) {
  return refutationsAt(puzzleId, ply)?.get(move);
}
