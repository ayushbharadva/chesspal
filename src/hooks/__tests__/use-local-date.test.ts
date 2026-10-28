import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { useLocalDate } from '@/hooks/use-local-date';

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'] });
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it('refreshes on foreground after suspension and a backwards clock change', async () => {
  jest.setSystemTime(new Date(2026, 9, 27, 10));
  const subscription = jest.spyOn(AppState, 'addEventListener');
  const clock = await renderHook(useLocalDate);
  try {
    const change = subscription.mock.calls.find(([event]) => event === 'change')![1];
    expect(clock.result.current).toBe('2026-10-27');
    jest.setSystemTime(new Date(2026, 9, 30, 15));
    await act(() => change('background'));
    expect(clock.result.current).toBe('2026-10-27');
    await act(() => change('active'));
    expect(clock.result.current).toBe('2026-10-30');
    jest.setSystemTime(new Date(2026, 9, 26, 8));
    await act(() => change('active'));
    expect(clock.result.current).toBe('2026-10-26');
    expect(jest.getTimerCount()).toBe(1);
  } finally {
    await clock.unmount();
  }
});

it('rolls over the local year boundary and cleans up its timer and listener', async () => {
  jest.setSystemTime(new Date(2026, 11, 31, 23, 59, 59));
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove });
  const clock = await renderHook(useLocalDate);
  expect(clock.result.current).toBe('2026-12-31');
  await act(() => {
    jest.advanceTimersByTime(1000);
  });
  expect(clock.result.current).toBe('2027-01-01');
  expect(jest.getTimerCount()).toBe(1);
  await clock.unmount();
  expect(remove).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});
