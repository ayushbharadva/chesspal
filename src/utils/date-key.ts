export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dayNumber(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

export function activityStreak(keys: string[], today: string) {
  const days = new Set(keys.map(dayNumber));
  let cursor = dayNumber(today);
  if (!days.has(cursor)) cursor -= 1;
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor -= 1;
  }
  return streak;
}

export function bestActivityStreak(keys: string[]) {
  const days = [...new Set(keys.map(dayNumber))].sort((first, second) => first - second);
  let best = 0;
  let current = 0;
  let previous = -Infinity;
  for (const day of days) {
    current = day === previous + 1 ? current + 1 : 1;
    best = Math.max(best, current);
    previous = day;
  }
  return best;
}
