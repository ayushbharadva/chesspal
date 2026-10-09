import { getGreeting } from '@/utils/greeting';

describe('getGreeting', () => {
  it.each([
    [5, 'Good morning'],
    [11, 'Good morning'],
    [12, 'Good afternoon'],
    [16, 'Good afternoon'],
    [17, 'Good evening'],
    [23, 'Good evening'],
    [0, 'Good evening'],
    [4, 'Good evening'],
  ])('hour %i says "%s"', (hour, expectedGreeting) => {
    expect(getGreeting(hour)).toBe(expectedGreeting);
  });
});
