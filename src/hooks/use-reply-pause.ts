import { useEffect, useState } from 'react';

import { useMotionEnabled } from '@/hooks/use-motion';

export const REPLY_PAUSE_MS = 480;

/**
 * True for a moment after a line advances, so the player sees their own move land
 * before the opponent replies. `series` identifies the puzzle or lesson being played.
 */
export function useReplyPause(series: string, ply: number, active: boolean) {
  const motion = useMotionEnabled();
  const [settled, setSettled] = useState({ series, ply });
  const current = settled.series === series && settled.ply === ply;
  const pausing = !current && motion && active && settled.series === series && ply > settled.ply;
  // Anything other than a forward step in the same line needs no pause.
  if (!current && !pausing) setSettled({ series, ply });
  useEffect(() => {
    if (!pausing) return;
    const timer = setTimeout(() => setSettled({ series, ply }), REPLY_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [pausing, series, ply]);
  return pausing;
}
