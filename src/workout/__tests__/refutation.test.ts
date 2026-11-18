import { playMove, positionAfter } from '@/chess';
import { puzzleById, puzzles, type Puzzle } from '@/content';
import * as refutations from '@/content/refutations';
import { type Refutation } from '@/content/refutations';
import { MATE_THEMES, type RefutationReason } from '@/content/types';
import { useProgressStore } from '@/progress/store';
import { emptyProgress } from '@/progress/types';
import { decodeProgress, validProgress } from '@/storage/schema';
import { wrongMoveMessage } from '@/workout/refutation';
import { applyAnswer, makeSession, restartPuzzle, undoWrongMove } from '@/workout/session';

/** The first stored wrong move with this reason, in a puzzle with or without a mate theme. */
function example(reason: RefutationReason, mateTheme: boolean) {
  for (const puzzle of puzzles) {
    if (MATE_THEMES.includes(puzzle.theme) !== mateTheme) continue;
    for (let ply = 0; ply < puzzle.moves.length; ply += 2)
      for (const [wrong, refutation] of refutations.refutationsAt(puzzle.id, ply)!)
        if (refutation.reason === reason) return { puzzle, ply, wrong, refutation };
  }
  throw new Error(`No ${reason} example`);
}
function message(
  { puzzle, ply, wrong, refutation }: ReturnType<typeof example>,
  themeNamed = true,
) {
  return wrongMoveMessage(puzzle, ply, wrong, refutation, themeNamed);
}

describe('wrongMoveMessage', () => {
  it('names what the reply takes, adding "not checkmate" only where a mate was the goal', () => {
    const firstPuzzle = puzzleById['01ZiW'];
    const rookTaken = refutations.refutationFor(firstPuzzle.id, 0, 'd4d7')!;
    expect(wrongMoveMessage(firstPuzzle, 0, 'd4d7', rookTaken, true)).toBe(
      "That's not checkmate. White takes your rook on d7.",
    );
    expect(wrongMoveMessage(firstPuzzle, 0, 'd4d7', rookTaken, false)).toBe(
      'White takes your rook on d7.',
    );
    expect(message(example('capture', false))).toMatch(
      /^(White|Black) takes your (pawn|knight|bishop|rook|queen) on [a-h][1-8]\.$/,
    );
  });
  it('describes a checkmating reply in words', () => {
    expect(message(example('mate', false))).toMatch(
      /^(White|Black) checkmates you: (Pawn|Knight|Bishop|Rook|Queen|King) (to|captures on) [a-h][1-8]/,
    );
  });
  it('tells where the king escapes, unless the round hides the theme', () => {
    const escape = example('escape', true);
    expect(message(escape)).toMatch(/^The king escapes to [a-h][1-8]\.$/);
    expect(message(escape, false)).toMatch(
      /^(White|Black) is safe now\. Look for checks, captures and threats\.$/,
    );
  });
  it('gives the theme hint for a quiet reply, or a general one when the theme is hidden', () => {
    const fork = example('defend', false);
    expect(message(fork)).toMatch(/^(White|Black) is safe now\. \S/);
    expect(message(fork, false)).toMatch(/is safe now\. Look for checks, captures and threats\.$/);
    expect(message(example('defend', true))).toMatch(/^That's not checkmate\. \S/);
  });
  it('explains moves with no reply', () => {
    const puzzle = puzzles[0];
    const none = (reason: RefutationReason): Refutation => ({ reply: null, reason });
    expect(wrongMoveMessage(puzzle, 0, 'a1a1', none('alsoGood'), true)).toBe(
      "Good move, but there's a stronger one.",
    );
    expect(wrongMoveMessage(puzzle, 0, 'a1a1', none('stalemate'), true)).toBe(
      "That's stalemate, a draw. Give the king a square.",
    );
  });
});

describe('a wrong move with a stored reply', () => {
  const { puzzle, ply, wrong } = example('capture', false);
  function roundAt(target: Puzzle) {
    const round = { ...makeSession('wrong', 'extra', '2026-11-18', []), puzzleIds: [target.id] };
    let session = round;
    for (let move = 0; move < ply; move += 2)
      session = applyAnswer(session, target, target.moves[move]);
    return session;
  }

  it('stays on the board, counts a mistake and ignores other moves until it is taken back', () => {
    const before = roundAt(puzzle);
    const wrongShown = applyAnswer(before, puzzle, wrong);
    expect(wrongShown).toMatchObject({ wrongMove: wrong, lastWrong: false, mistakes: 1, ply });
    expect(applyAnswer(wrongShown, puzzle, puzzle.moves[ply])).toBe(wrongShown);
    expect(undoWrongMove(wrongShown)).toEqual({ ...wrongShown, wrongMove: null });
    expect(undoWrongMove(before)).toBe(before);
    expect(restartPuzzle(wrongShown)).toEqual({
      ...wrongShown,
      wrongMove: null,
      ply: 0,
      hintsShown: 0,
    });
    // Taken back, the answer still solves the position.
    expect(applyAnswer(undoWrongMove(wrongShown), puzzle, puzzle.moves[ply]).wrongMove).toBeNull();
  });

  it('falls back to shake and try again when no reply is stored', () => {
    const lookup = jest.spyOn(refutations, 'refutationFor').mockReturnValueOnce(undefined);
    expect(applyAnswer(roundAt(puzzle), puzzle, wrong)).toMatchObject({
      wrongMove: null,
      lastWrong: true,
      mistakes: 1,
    });
    lookup.mockRestore();
  });

  it('turns off Hint and Show answer until Back one move or Reset', () => {
    const state = useProgressStore.getState;
    useProgressStore.setState({ ...emptyProgress(), hydrated: true, currentSession: null });
    useProgressStore.setState({ currentSession: applyAnswer(roundAt(puzzle), puzzle, wrong) });
    state().hint();
    state().reveal();
    expect(state().currentSession).toMatchObject({
      hintsShown: 0,
      phase: 'solve',
      usedHelp: false,
    });
    state().undoWrongMove();
    expect(state().currentSession!.wrongMove).toBeNull();
    state().answer(wrong);
    state().resetPuzzle();
    expect(state().currentSession).toMatchObject({ wrongMove: null, ply: 0, mistakes: 2 });
  });

  it('saves and validates the shown move, and clears it when the app reopens', () => {
    const shown = applyAnswer(roundAt(puzzle), puzzle, wrong);
    const saved = { ...emptyProgress(), currentSession: shown };
    expect(validProgress(saved)).toBe(true);
    expect(validProgress({ ...saved, currentSession: { ...shown, wrongMove: 'e2' } })).toBe(false);
    expect(validProgress({ ...saved, currentSession: { ...shown, phase: 'replay' } })).toBe(false);
    const reopened = decodeProgress(JSON.stringify({ state: saved, version: 1 })).state;
    expect(reopened.currentSession).toMatchObject({ wrongMove: null, ply: 0, mistakes: 1 });
    const { wrongMove: _older, ...olderSession } = makeSession('old', 'extra', '2026-11-18', []);
    const older = { ...emptyProgress(), currentSession: olderSession };
    expect(
      decodeProgress(JSON.stringify({ state: older, version: 1 })).state.currentSession,
    ).toMatchObject({ wrongMove: null });
  });

  it('plays a legal reply from the position after the wrong move', () => {
    const position = playMove(positionAfter(puzzle.fen, puzzle.moves, ply), wrong).fen;
    const { reply } = refutations.refutationFor(puzzle.id, ply, wrong)!;
    expect(playMove(position, reply!).captured).toBeDefined();
  });
});
