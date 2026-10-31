import { fireEvent, render, screen } from '@testing-library/react-native';
import { INITIAL_POSITION } from '@/chess';
import { Board, dropSquare } from '@/components/board/board';

it('offers legal targets, rejects illegal taps and reports legal moves', async () => {
  const onMove = jest.fn();
  const onIllegalMove = jest.fn();
  await render(
    <Board fen={INITIAL_POSITION} interactive onMove={onMove} onIllegalMove={onIllegalMove} />,
  );
  expect(screen.getAllByRole('button')).toHaveLength(64);
  await fireEvent.press(screen.getByTestId('square-e2'));
  expect(screen.getByLabelText('e4, empty, legal destination')).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('square-e5'));
  expect(onMove).not.toHaveBeenCalled();
  expect(onIllegalMove).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByTestId('square-e4'));
  expect(onMove).toHaveBeenCalledWith('e2e4');
});
it('requires a promotion choice and supports underpromotion', async () => {
  const onMove = jest.fn();
  await render(<Board fen="7k/P7/8/8/8/8/8/7K w - - 0 1" interactive onMove={onMove} />);
  await fireEvent.press(screen.getByTestId('square-a7'));
  await fireEvent.press(screen.getByTestId('square-a8'));
  expect(onMove).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Promote to knight' }));
  expect(onMove).toHaveBeenCalledWith('a7a8n');
});

describe('dropSquare', () => {
  const size = 40;
  const white = ['abcdefgh', '87654321'] as const;
  const black = ['hgfedcba', '12345678'] as const;

  it('finds the square under a dragged piece from either side', () => {
    // e2 for White sits at column 4, row 6; dragging up two squares reaches e4.
    expect(dropSquare({ x: 160, y: 240 }, 0, -80, size, ...white)).toBe('e4');
    // The same squares for Black are mirrored, so e2 sits at column 3, row 1.
    expect(dropSquare({ x: 120, y: 40 }, 0, 80, size, ...black)).toBe('e4');
    expect(dropSquare({ x: 160, y: 240 }, 45, -10, size, ...white)).toBe('f2');
  });

  it('rounds to the nearest square, so a drop needs only to land on it', () => {
    expect(dropSquare({ x: 160, y: 240 }, 19, -19, size, ...white)).toBe('e2');
    expect(dropSquare({ x: 160, y: 240 }, 21, -21, size, ...white)).toBe('f3');
  });

  it('returns null for a drop off the board', () => {
    expect(dropSquare({ x: 0, y: 0 }, -30, 0, size, ...white)).toBeNull();
    expect(dropSquare({ x: 280, y: 280 }, 0, 30, size, ...white)).toBeNull();
  });
});
