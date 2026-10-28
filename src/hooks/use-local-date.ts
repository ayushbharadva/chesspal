import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { dateKey } from '@/utils/date-key';

export function useLocalDate() {
  const [today, setToday] = useState(() => dateKey());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function refresh() {
      const now = new Date();
      setToday(dateKey(now));
      clearTimeout(timer);
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      timer = setTimeout(refresh, Math.max(1, midnight.getTime() - now.getTime()));
    }
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);
  return today;
}
