import { act, renderHook } from '@testing-library/react-native';

import { REPLY_PAUSE_MS, useReplyPause } from '@/hooks/use-reply-pause';

const mockMotion = jest.fn(() => true);
jest.mock('@/hooks/use-motion', () => ({ useMotionEnabled: () => mockMotion() }));

beforeEach(() => {
  mockMotion.mockReturnValue(true);
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

async function setup(ply = 0, series = 'a', active = true) {
  return renderHook(
    (props: { series: string; ply: number; active: boolean }) =>
      useReplyPause(props.series, props.ply, props.active),
    { initialProps: { series, ply, active } },
  );
}

it('does not pause on first render, even when resuming mid-line', async () => {
  const { result } = await setup(2);
  expect(result.current).toBe(false);
});

it('pauses after a forward step, then settles', async () => {
  const { result, rerender } = await setup();
  await rerender({ series: 'a', ply: 2, active: true });
  expect(result.current).toBe(true);
  await act(async () => {
    jest.advanceTimersByTime(REPLY_PAUSE_MS);
  });
  expect(result.current).toBe(false);
});

it('does not pause when moving to another puzzle or backwards', async () => {
  const { result, rerender } = await setup(2);
  await rerender({ series: 'b', ply: 4, active: true });
  expect(result.current).toBe(false);
  await rerender({ series: 'b', ply: 2, active: true });
  expect(result.current).toBe(false);
});

it('does not pause when the line has finished', async () => {
  const { result, rerender } = await setup();
  await rerender({ series: 'a', ply: 2, active: false });
  expect(result.current).toBe(false);
});

it('respects a device set to reduce motion', async () => {
  mockMotion.mockReturnValue(false);
  const { result, rerender } = await setup();
  await rerender({ series: 'a', ply: 2, active: true });
  expect(result.current).toBe(false);
});
