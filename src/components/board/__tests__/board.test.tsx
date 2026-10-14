import { fireEvent, render, screen } from '@testing-library/react-native';
import { INITIAL_POSITION } from '@/chess';
import { Board } from '@/components/board/board';

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
