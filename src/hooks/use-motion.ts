import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** False when the player asked their device to reduce motion. */
export function useMotionEnabled() {
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (active) setEnabled(!reduced);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) =>
      setEnabled(!reduced),
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return enabled;
}
