import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { playMove, readPosition, type Square } from '@/chess';
import { Board } from '@/components/board/board';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { styles, type StepProps } from '@/components/course/text-steps';
import { defenderReply } from '@/course/defender';
import {
  answerMoveStep,
  captureDrillMove,
  collectStar,
  coursePuzzles,
  parSlips,
  playOutcome,
  replyOutcome,
} from '@/course/steps';
import { useHaptics } from '@/hooks/use-haptics';
import { useMotionEnabled } from '@/hooks/use-motion';
import { REPLY_PAUSE_MS } from '@/hooks/use-reply-pause';
import { CHIME_DELAY_MS, playSound } from '@/sounds/play-sound';

type LastMove = { from: Square; to: Square };
const squares = (uci: string): LastMove => ({
  from: uci.slice(0, 2) as Square,
  to: uci.slice(2, 4) as Square,
});

/** Right and wrong feedback shared by the board steps. */
function useFeedback() {
  const haptic = useHaptics();
  const [mistakes, setMistakes] = useState(0);
  return {
    mistakes,
    wrong() {
      haptic('error');
      playSound('wrong');
      setMistakes((count) => count + 1);
    },
    right() {
      haptic('success');
      setTimeout(() => playSound('correct'), CHIME_DELAY_MS);
    },
  };
}

/** Waits a moment before the other side's reply, so the player sees their own move land. */
function usePause() {
  const motion = useMotionEnabled();
  return motion ? REPLY_PAUSE_MS : 0;
}

function Message({ text }: { text?: string }) {
  return (
    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.message}>
      {text ?? ' '}
    </ThemedText>
  );
}

export function StarsStep({ step, onComplete, done }: StepProps<'stars'>) {
  const feedback = useFeedback();
  const [state, setState] = useState({ fen: step.fen, remaining: step.stars, moves: 0 });
  const [lastMove, setLastMove] = useState<LastMove>();
  function onMove(move: string) {
    const after = collectStar(state.fen, state.remaining, move);
    const moves = state.moves + 1;
    setState({ fen: after.fen, remaining: after.remaining, moves });
    setLastMove(squares(move));
    if (after.remaining.length) return;
    feedback.right();
    onComplete(
      parSlips(moves, step.par),
      moves <= step.par
        ? `All stars in ${moves} ${moves === 1 ? 'move' : 'moves'}.`
        : `Done! It can be done in ${step.par}.`,
    );
  }
  return (
    <View style={styles.step}>
      <ThemedText type="subtitle">{step.prompt}</ThemedText>
      <Board
        fen={state.fen}
        interactive={!done}
        onMove={onMove}
        lastMove={lastMove}
        stars={state.remaining}
        marks={step.marks}
        arrows={state.moves === 0 ? step.arrows : undefined}
      />
      <Message
        text={`${state.remaining.length} ${state.remaining.length === 1 ? 'star' : 'stars'} left · ${state.moves} ${state.moves === 1 ? 'move' : 'moves'}`}
      />
    </View>
  );
}

export function CaptureStep({ step, onComplete, done }: StepProps<'capture'>) {
  const feedback = useFeedback();
  const [state, setState] = useState({ fen: step.fen, moves: 0, slips: 0 });
  const [lastMove, setLastMove] = useState<LastMove>();
  const [message, setMessage] = useState<string>();
  function onMove(move: string) {
    const after = captureDrillMove(state.fen, move);
    if (!after.safe) {
      feedback.wrong();
      setState({ ...state, slips: state.slips + 1 });
      setMessage('An enemy piece could take it there. Try another move.');
      return;
    }
    const moves = state.moves + 1;
    setState({ ...state, fen: after.fen, moves });
    setLastMove(squares(move));
    setMessage(undefined);
    if (after.left) return;
    feedback.right();
    onComplete(state.slips + parSlips(moves, step.par), 'Every piece taken, and none lost.');
  }
  return (
    <View style={styles.step}>
      <ThemedText type="subtitle">{step.prompt}</ThemedText>
      <Board
        fen={state.fen}
        interactive={!done}
        onMove={onMove}
        lastMove={lastMove}
        marks={step.marks}
        arrows={state.moves === 0 ? step.arrows : undefined}
        shakeKey={feedback.mistakes}
      />
      <Message text={message} />
    </View>
  );
}

export function TapStep({ step, onComplete, done }: StepProps<'tap'>) {
  const feedback = useFeedback();
  const [found, setFound] = useState<string[]>([]);
  const [wrongSquare, setWrongSquare] = useState<string>();
  function onSquarePress(square: Square) {
    if (done || found.includes(square)) return;
    if (!step.answers.includes(square)) {
      feedback.wrong();
      setWrongSquare(square);
      return;
    }
    const next = [...found, square];
    setFound(next);
    setWrongSquare(undefined);
    if (next.length === step.answers.length) {
      feedback.right();
      onComplete(feedback.mistakes, step.explanation);
    }
  }
  return (
    <View style={styles.step}>
      <ThemedText type="subtitle">{step.prompt}</ThemedText>
      <Board
        fen={step.fen}
        orientation={readPosition(step.fen).turn}
        marks={step.marks}
        arrows={step.arrows}
        found={done ? step.answers : found}
        wrongSquare={wrongSquare}
        onSquarePress={onSquarePress}
        shakeKey={feedback.mistakes}
      />
      <Message
        text={
          step.answers.length > 1
            ? `${found.length} of ${step.answers.length} found`
            : wrongSquare
              ? `That is ${wrongSquare}.`
              : undefined
        }
      />
    </View>
  );
}

/** Plays a line: the player's moves are checked, and scripted replies follow after a pause. */
export function MoveStep({ step, onComplete, done }: StepProps<'move'>) {
  const feedback = useFeedback();
  const pause = usePause();
  const [state, setState] = useState({ fen: step.fen, ply: 0, slips: 0, hint: false });
  const [lastMove, setLastMove] = useState<LastMove>();
  const [reply, setReply] = useState<string>();
  const [message, setMessage] = useState<string>();
  const orientation = step.orientation ?? readPosition(step.fen).turn;

  useEffect(() => {
    if (!reply) return;
    const timer = setTimeout(() => {
      setState((current) => ({
        ...current,
        fen: playMove(current.fen, reply).fen,
        ply: current.ply + 2,
      }));
      setLastMove(squares(reply));
      setReply(undefined);
    }, pause);
    return () => clearTimeout(timer);
  }, [reply, pause]);

  function onMove(move: string) {
    const answer = answerMoveStep(step, state.fen, state.ply, move);
    if (!answer.accepted) {
      feedback.wrong();
      setState({ ...state, slips: state.slips + 1 });
      setMessage('Not that one. Try again.');
      return;
    }
    setState({ ...state, fen: answer.fen! });
    setLastMove(squares(move));
    setMessage(undefined);
    if (answer.reply) {
      setReply(answer.reply);
      return;
    }
    feedback.right();
    onComplete(state.slips, step.explanation);
  }

  return (
    <View style={styles.step}>
      <ThemedText type="subtitle">{step.prompt}</ThemedText>
      <Board
        fen={state.fen}
        orientation={orientation}
        interactive={!done && !reply}
        onMove={onMove}
        lastMove={lastMove}
        hintSquare={state.hint && !done ? (step.line[state.ply].slice(0, 2) as Square) : undefined}
        marks={step.marks}
        arrows={state.ply === 0 && !lastMove ? step.arrows : undefined}
        shakeKey={feedback.mistakes}
      />
      <Message text={state.hint && !done ? step.hint : message} />
      {!done && !state.hint && (
        <Button
          variant="secondary"
          icon="lightbulb"
          label="Hint"
          onPress={() => setState({ ...state, hint: true, slips: state.slips + 1 })}
        />
      )}
    </View>
  );
}

/** Plays against the simple defender until the goal is met, the game is drawn or moves run out. */
export function PlayStep({ step, onComplete, done }: StepProps<'play'>) {
  const feedback = useFeedback();
  const pause = usePause();
  const start = { fen: step.fen, moves: 0 };
  const [state, setState] = useState(start);
  const [slips, setSlips] = useState(0);
  const [hint, setHint] = useState(false);
  const [lastMove, setLastMove] = useState<LastMove>();
  const [thinking, setThinking] = useState(false);
  const [failed, setFailed] = useState<string>();

  useEffect(() => {
    if (!thinking) return;
    const timer = setTimeout(() => {
      setThinking(false);
      const reply = defenderReply(state.fen, step.goal);
      if (!reply) return;
      const fen = playMove(state.fen, reply).fen;
      setState({ ...state, fen });
      setLastMove(squares(reply));
      if (replyOutcome(fen) === 'drawn') {
        feedback.wrong();
        setSlips((count) => count + 1);
        setFailed('Your last piece is gone, so it is a draw.');
      }
    }, pause);
    return () => clearTimeout(timer);
    // The reply starts once per player move; the position it answers is already in `state`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thinking]);

  function onMove(move: string) {
    const moves = state.moves + 1;
    const result = playOutcome(step, state.fen, move, moves);
    setState({ fen: result.fen, moves });
    setLastMove(squares(move));
    if (result.outcome === 'won') {
      feedback.right();
      onComplete(slips, step.goal === 'checkmate' ? `Checkmate in ${moves} moves.` : 'Promoted!');
    } else if (result.outcome === 'ongoing') {
      setThinking(true);
    } else {
      feedback.wrong();
      setSlips(slips + 1);
      setFailed(
        result.outcome === 'over-limit'
          ? `Out of moves. You have ${step.limit} to do it.`
          : step.goal === 'promote'
            ? 'The new queen can be taken. Try again.'
            : 'Stalemate: the king cannot move but is not in check. That is a draw.',
      );
    }
  }

  return (
    <View style={styles.step}>
      <ThemedText type="subtitle">{step.prompt}</ThemedText>
      <Board
        fen={state.fen}
        orientation={step.orientation ?? 'w'}
        interactive={!done && !thinking && !failed}
        onMove={onMove}
        lastMove={lastMove}
        marks={state.moves === 0 ? step.marks : undefined}
        shakeKey={feedback.mistakes}
      />
      <Message
        text={
          failed ??
          (hint && !done
            ? step.hint
            : `Move ${Math.min(state.moves + 1, step.limit)} of ${step.limit}`)
        }
      />
      {!done && failed && (
        <Button
          icon="rotate-ccw"
          label="Try again"
          onPress={() => {
            setState(start);
            setLastMove(undefined);
            setFailed(undefined);
          }}
        />
      )}
      {!done && !failed && !hint && (
        <Button
          variant="secondary"
          icon="lightbulb"
          label="Hint"
          onPress={() => {
            setHint(true);
            setSlips(slips + 1);
          }}
        />
      )}
    </View>
  );
}

/** A few bundled puzzles, each played like a move step. */
export function PuzzlesStep({
  step,
  onComplete,
  done,
  replay,
}: StepProps<'puzzles'> & { replay: number }) {
  const [list] = useState(() => coursePuzzles(step, replay));
  const [index, setIndex] = useState(0);
  const [slips, setSlips] = useState(0);
  const [solved, setSolved] = useState(false);
  const puzzle = list[index];
  const last = index === list.length - 1;
  return (
    <View style={styles.step}>
      <ThemedText type="overline" themeColor="accent">
        Puzzle {index + 1} of {list.length}
      </ThemedText>
      <MoveStep
        key={puzzle.id}
        step={{
          kind: 'move',
          prompt: index === 0 ? step.prompt : puzzle.goal,
          fen: puzzle.fen,
          line: puzzle.moves,
          hint: puzzle.hints[0],
          explanation: puzzle.explanation,
        }}
        done={solved || done}
        onComplete={(puzzleSlips, note) => {
          const total = slips + puzzleSlips;
          setSlips(total);
          setSolved(true);
          if (last) onComplete(total, note);
        }}
      />
      {solved && !last && (
        <Button
          label="Next puzzle"
          onPress={() => {
            setIndex(index + 1);
            setSolved(false);
          }}
        />
      )}
    </View>
  );
}
